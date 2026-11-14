{ pkgs }:
let
  base = "https://raw.githubusercontent.com/vectorize-io/hindsight/v1.2.1/hindsight-integrations/coding-agents/src/core";
  source = name: sha256: pkgs.fetchurl { url = "${base}/${name}"; inherit sha256; };
  parser = source "transcript-codex.ts" "1l5mz6i9s8h3m62w6kn77f5bxag4nqpfxymvf42n4ah59zyl7462";
  jsonl = source "jsonl.ts" "09xg867zlpw55i6hir45sphhj5rhvbq58k7jrngnibmgvbyf790g";
  utility = source "transcript-util.ts" "18fbjjxngbw9i3jim5mdj9iqizd37pf7ixwr45v79k6jkagiayik";
in
pkgs.runCommand "hindsight-codex-parser" { nativeBuildInputs = [ pkgs.esbuild ]; } ''
  cp ${parser} transcript-codex.ts
  cp ${jsonl} jsonl.ts
  cp ${utility} transcript-util.ts
  esbuild transcript-codex.ts --bundle --platform=node --format=cjs --target=node18 --outfile="$out"
''
