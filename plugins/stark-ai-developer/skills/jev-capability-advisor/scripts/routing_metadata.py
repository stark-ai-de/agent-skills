"""Optional public host guidance; never infer availability or permissions."""

TEXT_FIELDS = ('use_when', 'avoid_when', 'keywords')
MAX_ITEMS = 64
MAX_TEXT = 8192


def _text(value):
    if not isinstance(value, str) or len(value) > MAX_TEXT:
        raise ValueError('invalid_routing_metadata')
    return ' '.join(value.split())


def guidance(item):
    """Validate optional fields and return compact, explicitly labeled values."""
    result = {}
    for key in TEXT_FIELDS:
        if key not in item:
            continue
        value = item[key]
        if isinstance(value, str):
            values = [_text(value)]
        elif isinstance(value, list) and len(value) <= MAX_ITEMS:
            values = [_text(part) for part in value]
        else:
            raise ValueError('invalid_routing_metadata')
        text = '; '.join(value for value in values if value)
        if len(text) > MAX_TEXT:
            raise ValueError('invalid_routing_metadata')
        if text:
            result[key] = text
    if 'parameter_descriptions' in item:
        value = item['parameter_descriptions']
        if not isinstance(value, dict) or len(value) > MAX_ITEMS:
            raise ValueError('invalid_routing_metadata')
        parts = []
        for name, description in value.items():
            name, description = _text(name), _text(description)
            if not name:
                raise ValueError('invalid_routing_metadata')
            if description:
                parts.append((name, description))
        text = '; '.join(name + ': ' + description for name, description in sorted(parts))
        if len(text) > MAX_TEXT:
            raise ValueError('invalid_routing_metadata')
        if text:
            result['parameter_descriptions'] = text
    return result


def positive_text(item):
    values = guidance(item)
    # Avoid-conditions must never improve a candidate's lexical relevance.
    return ' '.join(values[key] for key in ('use_when', 'keywords', 'parameter_descriptions') if key in values)


def selection_text(item, description, limit):
    values = guidance(item)
    if not values:
        return description[:limit]
    paths = item.get('source_paths', [])
    if isinstance(paths, list):
        for path in paths:
            if isinstance(path, str) and path:
                normalized = ' '.join(path.split())
                if normalized:
                    values = {key: value.replace(normalized, '[local source]') for key, value in values.items()}
    parts = [('description', description)] if description else []
    parts.extend((key, values[key]) for key in ('use_when', 'avoid_when', 'keywords', 'parameter_descriptions') if key in values)
    # Divide the card budget across supplied fields so a long positive field
    # cannot consume all space before the avoid-condition is reached.
    overhead = sum(len(key) + 2 for key, _ in parts) + 3 * max(0, len(parts) - 1)
    if limit < overhead:
        return ''
    budgets = [0] * len(parts)
    remaining = limit - overhead
    while remaining and any(budgets[i] < len(value) for i, (_, value) in enumerate(parts)):
        for i, (_, value) in enumerate(parts):
            if remaining and budgets[i] < len(value):
                budgets[i] += 1
                remaining -= 1
    rendered = ' | '.join(key + ': ' + value[:budgets[i]] for i, (key, value) in enumerate(parts))
    return rendered[:limit]
