"""Offline catalog retrieval; no labels, external services, or language dictionaries.

All skills survive default retrieval. Tool capacity is filled by identifier-aware
BM25 and character ngrams, with fair expansion of explicitly named providers.
Provider aliases and transport groups are derived solely from catalog metadata.
"""
from collections import Counter, defaultdict, deque
from bisect import bisect_left
import math
import re
import unicodedata
from routing_metadata import positive_text


MAX_CANDIDATES = 240
POLICIES = ('current', 'balanced')
MAX_SNAPSHOT_TERMS = 200_000
MAX_SNAPSHOT_POSTINGS = 1_000_000
MAX_SNAPSHOT_TERM_BYTES = 4096


def tokenize(value):
    value = re.sub(r'([a-z\d])([A-Z])', r'\1 \2', value)
    value = re.sub(r'([A-Z])([A-Z][a-z])', r'\1 \2', value)
    value = unicodedata.normalize('NFKD', value.casefold())
    value = ''.join(char for char in value if not unicodedata.combining(char))
    return re.findall(r'[^\W_]+', value, re.UNICODE)


def stem(word):
    # Conservative surface morphology, not semantic translation or synonyms.
    for suffix in ('ingly', 'edly', 'ation', 'ungen', 'ments', 'ment', 'ness',
                   'ern', 'ing', 'ung', 'ies', 'ers', 'est', 'en', 'er', 'ed', 'es', 's'):
        if word.endswith(suffix) and len(word) - len(suffix) >= 4:
            return word[:-len(suffix)]
    return word


def terms(value):
    words = tokenize(value)
    return words + ['stem:' + stem(word) for word in words if len(word) >= 5]


def grams(value):
    result = set()
    for word in tokenize(value):
        if len(word) >= 4:
            padded = '^' + word + '$'
            result.update(padded[i:i + 3] for i in range(len(padded) - 2))
    return result


def compact(value):
    return ''.join(tokenize(value))


class CandidateIndex:
    """Build once, then search deterministic candidate cards.

    Returned dictionaries are the original catalog items, without extra keys.
    Limits below the number of skills cannot preserve all skills: callers get a
    deterministic score-ranked skill subset. The normal 240-card path keeps all.
    """

    def __init__(self, catalog, policy='current', *, snapshot=None):
        if policy not in POLICIES:
            raise ValueError('invalid_retrieval_policy')
        self.policy = policy
        self.catalog = list(catalog)
        if len({item['id'] for item in self.catalog}) != len(self.catalog):
            raise ValueError('catalog IDs must be unique')
        self.skills = [i for i, item in enumerate(self.catalog) if item['kind'] == 'skill']
        self.tools = [i for i, item in enumerate(self.catalog) if item['kind'] != 'skill']
        self.postings = defaultdict(list)
        self.gram_postings = defaultdict(list)
        self._positive = [positive_text(item) for item in self.catalog]
        if any(not isinstance(item.get('description', item.get('brief', '')), str) for item in self.catalog):
            raise ValueError('invalid_description')
        self.name_phrases = [' '.join(tokenize(item['name'])) for item in self.catalog]
        if snapshot is None:
            self._build_lexical()
        else:
            self._restore_snapshot(snapshot)
        self.families = defaultdict(lambda: defaultdict(list))
        self.aliases = defaultdict(set)
        plugin_by_prefix = {}
        for i in self.tools:
            item = self.catalog[i]
            match = re.search(r'part of plugin\s+[`\"]([^`\"]+)[`\"]',
                              item.get('description', ''), re.IGNORECASE)
            if match:
                provider = match.group(1)
                # A connector's common identifier prefix is metadata too.
                tail = item['name'].split('__')[-1]
                parts = tail.split('_')
                for stop in range(1, len(parts) + 1):
                    prefix = '_'.join(parts[:stop])
                    if compact(prefix) == compact(provider):
                        plugin_by_prefix[prefix] = provider
                        break
        for i in self.tools:
            item = self.catalog[i]
            name = item['name']
            parts = name.split('__')
            namespace = parts[1] if len(parts) >= 3 and parts[0] == 'mcp' else parts[0]
            provider = namespace
            match = re.search(r'part of plugin\s+[`\"]([^`\"]+)[`\"]',
                              item.get('description', ''), re.IGNORECASE)
            if match:
                provider = match.group(1)
            elif namespace == 'codex_apps':
                tail = parts[-1]
                prefixes = [prefix for prefix in plugin_by_prefix if tail.startswith(prefix + '_')]
                provider = plugin_by_prefix[max(prefixes, key=len)] if prefixes else tail.split('_')[0]
            family = compact(provider)
            self.families[family][namespace].append(i)
            self.aliases[family].add(family)
            provider_tokens = tokenize(provider)
            self.aliases[family].add(' '.join(provider_tokens))
            if namespace not in ('codex_apps', 'mcp'):
                self.aliases[family].add(compact(namespace))
                self.aliases[family].add(' '.join(tokenize(namespace)))
            # Multiword provider suffixes allow e.g. Ads Manager from the
            # catalog's ChatGPT Ads Manager without a hand-written alias table.
            for start in range(1, len(provider_tokens) - 1):
                self.aliases[family].add(' '.join(provider_tokens[start:]))
                self.aliases[family].add(''.join(provider_tokens[start:]))
        # Merge namespaces and plugin metadata that identify the same provider.
        self.aliases = {family: {alias for alias in aliases if len(alias) >= 3}
                        for family, aliases in self.aliases.items()}

    def _build_lexical(self):
        counts = []
        lengths = []
        for i, item in enumerate(self.catalog):
            name = item['name']
            description = item.get('description', item.get('brief', ''))
            if not isinstance(description, str):
                raise ValueError('invalid_description')
            extra = self._positive[i]
            if extra:
                description += ' ' + extra
            counter = Counter(terms(name) * 3 + terms(description))
            counts.append(counter)
            lengths.append(sum(counter.values()))
            for gram in grams(name + ' ' + description):
                self.gram_postings[gram].append(i)
        average = sum(lengths) / max(1, len(lengths)) or 1
        document_frequency = Counter(term for counter in counts for term in counter)
        count = len(self.catalog)
        for i, counter in enumerate(counts):
            norm = 1.2 * (0.25 + 0.75 * lengths[i] / average)
            for term, frequency in counter.items():
                idf = math.log(1 + (count - document_frequency[term] + 0.5) /
                               (document_frequency[term] + 0.5))
                self.postings[term].append((i, idf * frequency * 2.2 / (frequency + norm)))
        self.gram_weights = {gram: math.log(1 + count / len(posting))
                             for gram, posting in self.gram_postings.items()}

    def snapshot(self):
        """Explicit lexical data only; catalog authority is never restored."""
        return {'document_count': len(self.catalog),
                'postings': {term: [[i, score] for i, score in values]
                             for term, values in self.postings.items()},
                'gram_postings': {gram: list(values) for gram, values in self.gram_postings.items()},
                'gram_weights': dict(self.gram_weights)}

    @classmethod
    def from_snapshot(cls, catalog, snapshot, policy='current'):
        return cls(catalog, policy=policy, snapshot=snapshot)

    def _restore_snapshot(self, data):
        def invalid():
            raise ValueError('invalid_index_snapshot')

        size = len(self.catalog)
        if (not isinstance(data, dict) or set(data) != {
                'document_count', 'postings', 'gram_postings', 'gram_weights'} or
                type(data['document_count']) is not int or data['document_count'] != size):
            invalid()
        postings, grams_, weights = data['postings'], data['gram_postings'], data['gram_weights']
        if any(not isinstance(value, dict) or len(value) > MAX_SNAPSHOT_TERMS
               for value in (postings, grams_, weights)) or set(grams_) != set(weights):
            invalid()
        total = 0
        restored = {}
        for term, values in postings.items():
            if (not isinstance(term, str) or not term or len(term.encode('utf-8')) > MAX_SNAPSHOT_TERM_BYTES or
                    not isinstance(values, list) or not 0 < len(values) <= size):
                invalid()
            ceiling = 2.2 * math.log(1 + (size - len(values) + .5) / (len(values) + .5))
            previous = -1
            checked = []
            for pair in values:
                if not isinstance(pair, list) or len(pair) != 2:
                    invalid()
                i, score = pair
                if (type(i) is not int or not previous < i < size or
                        type(score) not in (int, float) or not math.isfinite(score) or
                        not 0 < score <= ceiling):
                    invalid()
                previous = i
                checked.append((i, score))
            total += len(checked)
            if total > MAX_SNAPSHOT_POSTINGS:
                invalid()
            restored[term] = checked
        restored_grams = {}
        for gram, values in grams_.items():
            if (not isinstance(gram, str) or len(gram) != 3 or
                    not isinstance(values, list) or not 0 < len(values) <= size):
                invalid()
            previous = -1
            for i in values:
                if type(i) is not int or not previous < i < size:
                    invalid()
                previous = i
            weight = weights[gram]
            if (type(weight) not in (int, float) or not math.isfinite(weight) or
                    not math.isclose(weight, math.log(1 + size / len(values)), rel_tol=0, abs_tol=1e-12)):
                invalid()
            total += len(values)
            if total > MAX_SNAPSHOT_POSTINGS:
                invalid()
            restored_grams[gram] = list(values)
        # Every host identifier must remain represented. This catches missing
        # dictionaries/postings in otherwise well-typed, self-consistent files
        # without rebuilding description tokenization on a cache hit.
        for i, item in enumerate(self.catalog):
            for term in set(terms(item['name'])):
                values = restored.get(term, [])
                position = bisect_left(values, (i,))
                if position == len(values) or values[position][0] != i:
                    invalid()
            for gram in grams(item['name']):
                values = restored_grams.get(gram, [])
                position = bisect_left(values, i)
                if position == len(values) or values[position] != i:
                    invalid()
        # Explicit assignment only after complete structural validation.
        self.postings = restored
        self.gram_postings = restored_grams
        self.gram_weights = dict(weights)

    def _scores(self, query):
        scores = [0.0] * len(self.catalog)
        for term in sorted(set(terms(query))):
            for i, score in self.postings.get(term, ()):
                scores[i] += score
        query_grams = grams(query)
        denominator = max(1, len(query_grams)) ** 0.5
        for gram in sorted(query_grams):
            contribution = 0.22 * self.gram_weights.get(gram, 0) / denominator
            for i in self.gram_postings.get(gram, ()):
                scores[i] += contribution
        normalized_query = ' ' + ' '.join(tokenize(query)) + ' '
        for i, identifier in enumerate(self.name_phrases):
            if identifier and ' ' + identifier + ' ' in normalized_query:
                scores[i] += 25
        return scores

    def search(self, query, limit=MAX_CANDIDATES):
        if not isinstance(query, str):
            raise TypeError('query must be a string')
        limit = min(MAX_CANDIDATES, max(0, int(limit)), len(self.catalog))
        if not limit:
            return []
        scores = self._scores(query)
        key = lambda i: (-scores[i], self.catalog[i]['id'])
        selected = sorted(self.skills, key=key)[:limit]
        selected_set = set(selected)
        capacity = limit - len(selected)
        tool_capacity = capacity
        if self.policy == 'balanced' and capacity:
            normalized = ' ' + ' '.join(tokenize(query)) + ' '
            # Explicit full host IDs/names take precedence over provider quotas.
            exact = [i for i in self.tools if any(
                ' ' + ' '.join(tokenize(self.catalog[i][field])) + ' ' in normalized
                for field in ('id', 'name'))]
            for i in sorted(exact, key=key)[:capacity]:
                selected.append(i)
                selected_set.add(i)
                capacity -= 1
        normalized_query = ' ' + ' '.join(tokenize(query)) + ' '
        query_words = set(tokenize(query))
        matching = []
        for family, aliases in self.aliases.items():
            if any((' ' + alias + ' ' in normalized_query or alias in query_words)
                   for alias in aliases):
                matching.append(family)
        # Equal turns across providers prevent a large service from starving a
        # second named service. Inside a provider, equal transport turns retain
        # curated connector tools alongside a much larger raw API namespace.
        provider_queues = []
        for family in sorted(matching):
            subqueues = [deque(sorted(items, key=key))
                         for _, items in sorted(self.families[family].items())]
            queue = deque()
            while any(subqueues):
                for subqueue in subqueues:
                    if subqueue:
                        queue.append(subqueue.popleft())
            provider_queues.append(queue)
        provider_remaining = capacity
        if self.policy == 'balanced':
            provider_remaining = max(0, (tool_capacity * 4 // 5) - (tool_capacity - capacity))
        while capacity and provider_remaining and any(provider_queues):
            for queue in provider_queues:
                if capacity and provider_remaining and queue:
                    i = queue.popleft()
                    if i not in selected_set:
                        selected.append(i)
                        selected_set.add(i)
                        capacity -= 1
                        provider_remaining -= 1
        if self.policy == 'balanced' and capacity and matching:
            named_tools = {i for family in matching for items in self.families[family].values() for i in items}
            outsiders = [i for i in self.tools if i not in named_tools and scores[i] > 0]
            for i in sorted(outsiders, key=key):
                if i not in selected_set:
                    selected.append(i)
                    selected_set.add(i)
                    capacity -= 1
                    if not capacity:
                        break
        if capacity:
            for i in sorted(self.tools, key=key):
                if i not in selected_set:
                    selected.append(i)
                    selected_set.add(i)
                    capacity -= 1
                    if not capacity:
                        break
        # Presentation remains relevance-ranked; membership guarantees are
        # independent from rank and never imply a capability is mandatory.
        return [self.catalog[i] for i in sorted(selected, key=key)]
