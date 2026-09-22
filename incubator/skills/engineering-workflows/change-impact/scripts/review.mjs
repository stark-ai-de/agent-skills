import { digest, integer, requireValue, text, verifyPacket } from "./collect.mjs";
import { validateRanking } from "./rank.mjs";

export function confirmationsFor(packet, confirmations = []) {
  const pairs = packet.candidates.length * packet.contracts.length;
  requireValue(
    Array.isArray(confirmations) && confirmations.length <= pairs,
    "Too many candidate confirmations",
  );
  const candidates = new Map(packet.candidates.map((candidate) => [candidate.id, candidate]));
  const contracts = new Map(packet.contracts.map((contract) => [contract.id, contract]));
  const seen = new Set();
  return confirmations.map((confirmation) => {
    const candidate = candidates.get(confirmation.candidateId);
    const contract = contracts.get(confirmation.contractId);
    requireValue(candidate && contract, "Unknown candidate or contract");
    const key = `${candidate.id}:${contract.id}`;
    requireValue(!seen.has(key), "Duplicate confirmation");
    seen.add(key);
    requireValue(
      ["confirmed", "dismissed", "unresolved"].includes(confirmation.status),
      "Invalid confirmation status",
    );
    text(confirmation.reason, "confirmation reason");
    text(confirmation.quote, "confirmation quote", 8000);
    requireValue(
      candidate.content.includes(confirmation.quote),
      "Confirmation quote is absent from candidate",
    );
    return {
      contractId: contract.id,
      candidateId: candidate.id,
      path: candidate.path,
      startLine: candidate.startLine,
      endLine: candidate.endLine,
      fileHash: candidate.fileHash,
      status: confirmation.status,
      reason: confirmation.reason,
      quote: confirmation.quote,
      evidence: contract.evidence,
      confirmationBy: "host-agent",
    };
  });
}

export function report(input) {
  const { packet, ranking, confirmations = [] } = input;
  verifyPacket(packet);
  if (ranking) validateRanking(packet, ranking);
  const rows = confirmationsFor(packet, confirmations);
  const pendingPairs = packet.candidates.length * packet.contracts.length - rows.length;
  const unresolvedPairs = rows.filter((row) => row.status === "unresolved").length;
  return {
    schemaVersion: 1,
    snapshotDigest: packet.snapshot.digest,
    source: {
      base: packet.snapshot.base,
      head: packet.snapshot.head,
      target: packet.snapshot.target,
    },
    status:
      pendingPairs ||
      unresolvedPairs ||
      packet.coverage.omissions.length ||
      ranking?.status === "incomplete"
        ? "incomplete"
        : "reviewed",
    findings: rows.filter((row) => row.status === "confirmed"),
    reviewed: rows,
    coverage: { ...packet.coverage, reviewedPairs: rows.length, pendingPairs, unresolvedPairs },
    ranking: ranking
      ? {
          model: ranking.model,
          status: ranking.status,
          usage: ranking.usage,
          errors: ranking.errors,
        }
      : null,
    meaning:
      "Confirmed findings are host judgments with source evidence, not a completeness or runtime-correctness guarantee.",
  };
}

export function queue(input) {
  const {
    packet,
    ranking,
    confirmations = [],
    requiredPaths = [],
    preferredCandidateIds = [],
  } = input;
  verifyPacket(packet);
  if (ranking) validateRanking(packet, ranking);
  const rows = confirmationsFor(packet, confirmations);
  const limit = integer(input.limit, 10, 50);
  const knownPaths = new Set(packet.candidates.map((candidate) => candidate.path));
  requireValue(
    Array.isArray(requiredPaths) && requiredPaths.every((file) => knownPaths.has(file)),
    "Required paths must be collected candidates; inspect omissions or expand scope",
  );
  const knownIds = new Set(packet.candidates.map((candidate) => candidate.id));
  requireValue(
    Array.isArray(preferredCandidateIds) &&
      new Set(preferredCandidateIds).size === preferredCandidateIds.length &&
      preferredCandidateIds.every((id) => knownIds.has(id)),
    "Invalid preferred candidate IDs",
  );
  const mandatory = new Set(requiredPaths);
  const evidenceCandidates = new Set();
  for (const contract of packet.contracts)
    for (const evidence of contract.evidence.filter((entry) => entry.side === "after")) {
      const candidates = packet.candidates.filter((candidate) => candidate.path === evidence.path);
      const matches = candidates.filter((candidate) => candidate.content.includes(evidence.quote));
      // Ambiguous or cross-chunk quotes retain conservative whole-file coverage.
      for (const candidate of matches.length === 1 ? matches : candidates)
        evidenceCandidates.add(candidate.id);
    }
  const done = new Set(
    rows
      .filter((row) => row.status !== "unresolved")
      .map((row) => `${row.candidateId}:${row.contractId}`),
  );
  const records = new Map(
    (ranking?.records ?? []).map((record) => [
      `${record.candidateId}:${record.contractId}`,
      record,
    ]),
  );
  const preferences = new Map(preferredCandidateIds.map((id, index) => [id, index]));
  const pending = [];
  for (const candidate of packet.candidates)
    for (const contract of packet.contracts) {
      const key = `${candidate.id}:${contract.id}`;
      if (!done.has(key))
        pending.push({
          candidate,
          contractId: contract.id,
          mandatory:
            mandatory.has(candidate.path) ||
            evidenceCandidates.has(candidate.id) ||
            /(?:^|\/)(?:AGENTS(?:\.override)?|CLAUDE)\.md$/.test(candidate.path),
          ranking: records.get(key) ?? null,
        });
    }
  pending.sort(
    (a, b) =>
      Number(b.mandatory) - Number(a.mandatory) ||
      (preferences.get(a.candidate.id) ?? Infinity) -
        (preferences.get(b.candidate.id) ?? Infinity) ||
      (b.ranking?.priority ?? -1) - (a.ranking?.priority ?? -1) ||
      a.candidate.path.localeCompare(b.candidate.path) ||
      a.candidate.startLine - b.candidate.startLine ||
      a.contractId.localeCompare(b.contractId),
  );
  const items = pending.slice(0, limit);
  const contracts = packet.contracts.filter((contract) =>
    items.some((item) => item.contractId === contract.id),
  );
  return {
    schemaVersion: 1,
    packetDigest: digest(packet),
    snapshotDigest: packet.snapshot.digest,
    source: {
      base: packet.snapshot.base,
      head: packet.snapshot.head,
      target: packet.snapshot.target,
    },
    mode: ranking ? "jev-advisory" : "host-only-unranked",
    rankingStatus: ranking?.status ?? null,
    contracts,
    items,
    coverage: {
      totalPairs: packet.candidates.length * packet.contracts.length,
      resolvedPairs: done.size,
      pendingPairs: pending.length,
      remainingAfterBatch: pending.length - items.length,
      mandatoryPendingPairs: pending.filter((item) => item.mandatory).length,
      collectionOmissions: packet.coverage.omissions,
    },
    meaning:
      "Only this batch's excerpts are shown. Remaining and unranked candidates remain pending; low priority never confirms irrelevance.",
  };
}
