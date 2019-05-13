/* Setup:*/
// Third Party libraries:
const arguments = Array.from(process.argv)
const appRoot = require('app-root-path')
const fs = require('fs')
const inquirer = require('inquirer')
const prompt = inquirer.createPromptModule()
// Local imports:
const utils = require('./utils')
const questions = require('./questions')
const CONFIG = require('./config')
const appPackage = require(`${appRoot}/package.json`)

/* Declarations: */
const releaseLogCLIOption = '--release'
const isReleaseLog = arguments[2] === releaseLogCLIOption
const releaseLogVersion = arguments[3]
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

/* Actions: */
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
        buildTheChangelog()
        break
    }
    case CONFIG.ACTIONS.PROMPT_CREATION: {
        const creationPromise = utils.promptCreation(prompt, questions.qCreateCL())
        creationPromise
        .then(createCL => {
            if (createCL) {
                interactiveSession()
                return true
            }
            throw new Error(errorExits.NOCREATIONOPTED)
        })
        .catch(handleErrors)
        break
    }
    default:
        break
}

/* Functions: */
function handleErrors(reason) {
    if (reason) {
        console.log('Premature Exit >', reason)
    } else {
        console.log('Premature Exit')
    }
}

function buildTheChangelog() {
    let existingChangelog
    let unreleasedLogs
    let generatedMarkdown
    let finalMarkdown
    const changelogPath = `${appRoot}/${CONFIG.CHANGELOG_FILE}`

    utils.initializeFile(fs, changelogPath)
    existingChangelog = utils.fetchExistingChangelog(fs, changelogPath, CONFIG.ENCODING)
    unreleasedLogs = utils.identifyUnreleasedLogs(existingChangelog, CONFIG.MARKDOWN_REGEX)
    entries = utils.addUnreleasedLogsToEntries(entries, unreleasedLogs)

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
    finalMarkdown = utils.mergeChangelogs(
        generatedMarkdown, 
        existingChangelog
    )

    utils.writeToFile(fs, finalMarkdown, changelogPath)
    console.log('\nSuccessfully built the  CHANGELOG\n')
}

function interactiveSession() {
    let _logType
    const logTypePromise = utils.promptTypeOfLog(prompt, questions.qTypeOfLog(types))

    logTypePromise
    .then(logType => {
        _logType = logType
        if (Object.values(types).includes(_logType)) {
           return utils.promptTypeTheLog(prompt, questions.qTypeTheLog(CONFIG.LOG_MESSAGE_LIMIT))
        }
        throw new Error(errorExits.UNKNOWNLOGTYPE)
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
            interactiveSession()
        } else {
            buildTheChangelog()
        }
    }).catch(handleErrors)
}