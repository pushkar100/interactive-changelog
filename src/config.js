module.exports = {
  ACTIONS: {
    RELEASE: 'RELEASE',
    PROMPT_CREATION: 'PROMPT_CREATION'
  },
  MARKDOWN_REGEX: {
    CONTAINS_RELEASE: /^\#\#\s+\[\d+\.\d+.\d+\]/,
    H3_HEADER: /^\#\#\#/,
    LIST_ITEM: /^\*\s+/,
    RELEASE: /^\[\d+\.\d+.\d+\]$/,
  },
  MARKDOWN: {
    UNRELEASED_TAG: '[Unreleased]'
  },
  RELEASE_VERSION_REGEX: /^\d+\.\d+\.\d+$/,
  LOG_MESSAGE_LIMIT: 80,
  CHANGELOG_FILE: 'CHANGELOG.md',
  ENCODING: 'utf-8',
  BULK_EDIT_TEMP_FILE: 'bulk-edit-log.json'
}
