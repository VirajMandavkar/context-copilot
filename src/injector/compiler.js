// src/injector/compiler.js — Context Compilation to Markdown
// Implements: SPEC-16 (context → Markdown formatting)

/**
 * Tag display configuration.
 * Order here determines section order in the compiled output.
 */
function formatItemContent(content, item) {
  if (item?.title) {
    return `**${item.title}**: ${content}`;
  }
  return content;
}

const TAG_CONFIG = [
  { tag: 'decision', heading: 'Decisions', format: (c, item) => `- ${formatItemContent(c, item)}` },
  { tag: 'constraint', heading: 'Constraints', format: (c, item) => `- ${formatItemContent(c, item)}` },
  { tag: 'task', heading: 'Tasks', format: (c, item) => (item && item.completed) ? `- [x] ${formatItemContent(c, item)}` : `- [ ] ${formatItemContent(c, item)}` },
  { tag: 'note', heading: 'Notes', format: (c, item) => `- ${formatItemContent(c, item)}` },
];

function compileTagSections(items, headingLevel = '###') {
  const grouped = {};
  for (const item of items) {
    if (!grouped[item.tag]) {
      grouped[item.tag] = [];
    }
    grouped[item.tag].push(item);
  }

  const sections = [];
  const knownTags = new Set(TAG_CONFIG.map(c => c.tag));

  for (const config of TAG_CONFIG) {
    const tagItems = grouped[config.tag];
    if (!tagItems || tagItems.length === 0) continue;

    const lines = tagItems.map((item) => config.format(item.content, item));
    sections.push(`${headingLevel} ${config.heading}\n${lines.join('\n')}`);
  }

  const unknownTags = Object.keys(grouped).filter(t => !knownTags.has(t));
  if (unknownTags.length > 0) {
    console.log('[ContextCopilot] Unknown tags found in session data:', unknownTags);
    const unknownLines = unknownTags.flatMap(tag =>
      grouped[tag].map(item => `- [${tag}] ${formatItemContent(item.content, item)}`)
    );
    sections.push(`${headingLevel} Other\n${unknownLines.join('\n')}`);
  }

  return sections;
}

/**
 * Compile a SessionState's items into a Markdown block.
 * SPEC-16: Groups items by tag, omits empty groups, wraps in horizontal rules.
 * Supports options.tag to compile only items for a specific tag (e.g. 'decision').
 * Supports options.group to compile only items for a specific group (e.g. 'Frontend UI').
 *
 * @param {object} sessionState — The SessionState object
 * @param {object} [options] — Options
 * @param {string} [options.tag] — Optional tag to scope compilation to ('all' or specific tag)
 * @param {string} [options.group] — Optional group to scope compilation to ('all' or specific group)
 * @returns {string} Compiled Markdown (empty string if no items)
 */
export function compileContext(sessionState, options = {}) {
  if (!sessionState?.items || sessionState.items.length === 0) {
    return '';
  }

  let items = sessionState.items;

  // Filter by group if specified and not 'all'
  const targetGroup = (options.group && options.group.toLowerCase() !== 'all')
    ? options.group.trim().toLowerCase()
    : null;

  if (targetGroup) {
    items = items.filter(i => (i.group || 'ungrouped').trim().toLowerCase() === targetGroup);
  }

  // Filter by tag if specified and not 'all'
  const targetTag = (options.tag && options.tag.toLowerCase() !== 'all')
    ? options.tag.trim().toLowerCase()
    : null;

  if (targetTag) {
    items = items.filter(i => i.tag.toLowerCase() === targetTag);
  }

  if (items.length === 0) {
    return '';
  }

  // Check if we are scoping to a single group
  if (targetGroup) {
    let groupDisplayName = options.group;
    if (sessionState.groups) {
      const match = sessionState.groups.find(g => g.toLowerCase() === targetGroup);
      if (match) groupDisplayName = match;
    }
    if (targetGroup === 'ungrouped') {
      groupDisplayName = 'Ungrouped';
    }

    const sections = compileTagSections(items, '###');
    if (sections.length === 0) return '';
    return `---\n## Working Memory (Context Copilot) — ${groupDisplayName}\n\n${sections.join('\n\n')}\n---`;
  }

  // All groups view: check if any items have custom groups
  const hasGroups = items.some(i => Boolean(i.group && i.group.trim() && i.group.trim().toLowerCase() !== 'ungrouped'));

  if (!hasGroups) {
    const sections = compileTagSections(items, '###');
    if (sections.length === 0) return '';
    return `---\n## Working Memory (Context Copilot)\n\n${sections.join('\n\n')}\n---`;
  }

  // Hierarchical group sections
  const groupOrder = [];
  const seenGroups = new Set();

  if (Array.isArray(sessionState.groups)) {
    for (const g of sessionState.groups) {
      const lower = g.toLowerCase();
      if (!seenGroups.has(lower) && lower !== 'ungrouped' && lower !== 'all') {
        seenGroups.add(lower);
        groupOrder.push({ name: g, key: lower });
      }
    }
  }

  for (const item of items) {
    if (item.group && item.group.trim()) {
      const lower = item.group.trim().toLowerCase();
      if (!seenGroups.has(lower) && lower !== 'ungrouped' && lower !== 'all') {
        seenGroups.add(lower);
        groupOrder.push({ name: item.group.trim(), key: lower });
      }
    }
  }

  groupOrder.push({ name: 'Ungrouped', key: 'ungrouped' });

  const groupSections = [];
  for (const group of groupOrder) {
    const groupItems = items.filter(i => {
      const g = (i.group || 'ungrouped').trim().toLowerCase();
      return g === group.key;
    });

    if (groupItems.length === 0) continue;

    const tagSections = compileTagSections(groupItems, '####');
    if (tagSections.length > 0) {
      groupSections.push(`### Group: ${group.name}\n\n${tagSections.join('\n\n')}`);
    }
  }

  if (groupSections.length === 0) return '';

  return `---\n## Working Memory (Context Copilot)\n\n${groupSections.join('\n\n')}\n---`;
}
