/* Setup:*/
// Third Party libraries:
import 'babel-polyfill';
import fs from 'fs'
import inquirer from 'inquirer'
import watch from 'node-watch'
// Local imports:
import utils from './utils'
import questions from './questions'
import CONFIG from './config'

import bulkJsonEdit from './bulk-json-edit'


/* Declarations: */
const appRoot = process.cwd()
const appPackage = utils.loadAppPackage(appRoot)
const prompt = inquirer.createPromptModule()
const releaseLogCLIOption = 'release'
let isReleaseLog
let releaseLogVersion

const EARLY_EXIT = 'EARLY_EXIT'
const BULK_EDIT_IN_PROGRESS = 'BULK_EDIT_IN_PROGRESS'
const types = {
  ADDED: 'Added',
  CHANGED: 'Changed',
  DEPRECATED: 'Deprecated',
  REMOVED: 'Removed',
  FIXED: 'Fixed',
  SECURITY: 'Security'
}
const errorExits = {
  NOCREATIONOPTED: 'User chose not to set a CHANGELOG',
  UNKNOWNLOGTYPE: 'Did not match any known log type',
  UNKNOWNLOGMESSAGE: 'No or Unknown log message was provided'
}
let privateKeysInEntries = ['_release', '_timestamp']
let entries = {
  _release: '',
  _timestamp: ''
}

/* Actions/exports: */
const interactiveChangelog = {
  init,
  handleUnusualFlow,
  watchBulkEditFile,
  buildTheChangelog,
  interactiveSession
}
module.exports = interactiveChangelog

/* Functions: */
function init(releaseLogArg, releaseVersionArg) {
  isReleaseLog = releaseLogArg === releaseLogCLIOption
  releaseLogVersion = releaseVersionArg
  entries = utils.createTemplate(entries, types)

  const processDetails = utils.startProcess(
    isReleaseLog,
    releaseLogVersion,
    CONFIG.RELEASE_VERSION_REGEX,
    appPackage
  )

  switch (processDetails.action ) {
    case CONFIG.ACTIONS.RELEASE: {
      entries = utils.addReleaseAndTimeStamp(entries, processDetails.releaseLogVersion)
      interactiveChangelog.buildTheChangelog()
      break
    }
    case CONFIG.ACTIONS.PROMPT_CREATION: {
      const creationPromise = utils.promptCreation(prompt, questions.qCreateCL())
      creationPromise
      .then(createCL => {
        if (createCL) {
          interactiveChangelog.interactiveSession()
          return true
        }
        throw new Error(errorExits.NOCREATIONOPTED)
      })
      .catch(interactiveChangelog.handleUnusualFlow)
      break
    }
    default:
      break
  }
}

/* Functions: */
function handleUnusualFlow(reason) {
  if (reason) {
    if ([EARLY_EXIT, errorExits.NOCREATIONOPTED].includes(reason.message)) {
      console.log('[Early exit]')
      process.exit(0)
    } else if (BULK_EDIT_IN_PROGRESS === reason.message) {
      console.log('[Bulk edit in progress]')
      interactiveChangelog.watchBulkEditFile()
    } else {
      console.log('[Erroneous Exit >]', reason)
      process.exit(1)
    }
  } else {
    console.log('[Premature exit]')
    process.exit(0)
  }
}

function watchBulkEditFile() {
  const bulkEditPath = `${appRoot}/${CONFIG.BULK_EDIT_TEMP_FILE}`
  const watcher = watch(bulkEditPath, { filter: /\.json$/ })
  watcher.on('change', (evt, name) => {
    if(evt === 'update') {
      let data = utils.fetchExistingFile(fs, bulkEditPath, CONFIG.ENCODING)
      try {
        entries = JSON.parse(data)
      } catch (e) {
        console.log('[Error: Invalid JSON saved in bulk edit! Exiting]')
        interactiveChangelog.handleUnusualFlow()
      }
      watcher.close()
      fs.unlinkSync(bulkEditPath)
      interactiveChangelog.buildTheChangelog(true)
    }
  })
}

function buildTheChangelog(doNotConsiderUnreleasedLogs) {
  let existingChangelog
  let unreleasedLogs
  let generatedMarkdown
  let finalMarkdown
  const changelogPath = `${appRoot}/${CONFIG.CHANGELOG_FILE}`

  utils.initializeFile(fs, changelogPath)
  existingChangelog = utils.fetchExistingFile(fs, changelogPath, CONFIG.ENCODING)

  if (!doNotConsiderUnreleasedLogs) {
    unreleasedLogs = utils.identifyUnreleasedLogs(existingChangelog, CONFIG.MARKDOWN_REGEX)
    entries = utils.addUnreleasedLogsToEntries(entries, unreleasedLogs)
  }

  generatedMarkdown = utils.generateMarkdownForEntries(
    entries,
    privateKeysInEntries,
    CONFIG.MARKDOWN.UNRELEASED_TAG,
    CONFIG.MARKDOWN_REGEX.RELEASE
  )
  existingChangelog = utils.cleanUpExistingMarkdown(
    existingChangelog,
    CONFIG.MARKDOWN_REGEX,
    CONFIG.MARKDOWN.UNRELEASED_TAG
  )
  finalMarkdown = utils.mergeStrings(
    generatedMarkdown,
    existingChangelog,
    '\n'
  )

  utils.writeToFile(fs, finalMarkdown, changelogPath)
  console.log('\nSuccessfully built the  CHANGELOG\n')
}

function interactiveSession() {
  let _logType
  const additionalChoices = {
      BULK_EDIT: 'BULK EDIT (In editor)',
      EXIT: 'EXIT'
  }
  const finalOptions = Object.assign({}, types, additionalChoices)
  const logTypePromise = utils.promptTypeOfLog(prompt, questions.qTypeOfLog(finalOptions))

  logTypePromise
  .then(logType => {
    _logType = logType
    if (Object.values(types).includes(_logType)) {
      return utils.promptTypeTheLog(prompt, questions.qTypeTheLog(CONFIG.LOG_MESSAGE_LIMIT))
    } else if(logType === additionalChoices.EXIT) {
      throw new Error(EARLY_EXIT)
    } else if (logType === additionalChoices.BULK_EDIT) {
      const changelogPath = `${appRoot}/${CONFIG.CHANGELOG_FILE}`
      const bulkEditPath = `${appRoot}/${CONFIG.BULK_EDIT_TEMP_FILE}`
      const spacing = 4
      utils.initializeFile(fs, bulkEditPath)
      let existingChangelog = utils.fetchExistingFile(fs, changelogPath, CONFIG.ENCODING)
      let unreleasedLogs = utils.identifyUnreleasedLogs(existingChangelog, CONFIG.MARKDOWN_REGEX)
      entries = utils.addUnreleasedLogsToEntries(entries, unreleasedLogs)
      utils.writeToFile(fs, JSON.stringify(entries, null, spacing), bulkEditPath)
      bulkJsonEdit.openFile(bulkEditPath, () => console.log('[Opened file for bulk edit!]'))
      throw new Error(BULK_EDIT_IN_PROGRESS)
    } else {
      throw new Error(errorExits.UNKNOWNLOGTYPE)
    }
  })
  .then(logMessage => {
    if (logMessage) {
      entries[_logType].push(logMessage)
      return utils.promptMoreLogs(prompt, questions.qMoreLogs())
    }
    throw new Error(errorExits.UNKNOWNLOGMESSAGE)
  })
  .then(moreLogs => {
    if (moreLogs) {
      interactiveChangelog.interactiveSession()
    } else {
      interactiveChangelog.buildTheChangelog()
    }
  }).catch(interactiveChangelog.handleUnusualFlow)
}
