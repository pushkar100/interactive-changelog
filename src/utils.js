/* Private helpers: */
const _simpleDeepClone = o => JSON.parse(JSON.stringify(o))
const _doesStringMatchRegex = (str, regex) => typeof str === 'string' && regex.test(str)
const _isNonEmptyString = str => typeof str === 'string' && str.length > 0
const removeUnreleasedLogs = (existingChangelog, markdownRegex) => {
    const delimiter = '\n'
    let parsingReleased = false
    return existingChangelog
        .split(delimiter)
        .filter(line => {
            if (markdownRegex.CONTAINS_RELEASE.test(line)) {
                parsingReleased = true
            }
            return parsingReleased
        }).join(delimiter)
}
const removeUnreleasedTag = (existingChangelog, unreleasedTag) => {
    const delimiter = '\n'
    return existingChangelog
        .split(delimiter)
        .map(line => line.includes(unreleasedTag) ? '' : line)
        .filter(line => !!line)
        .join(delimiter)
}

/* Public methods: */
module.exports.createTemplate = (entries, types) => {
    const newEntries = _simpleDeepClone(entries)
    for (key in types) {
        newEntries[types[key]] = newEntries[types[key]] || []
    }
    return newEntries
}

module.exports.startProcess = (isReleaseLog, releaseLogVersion, releaseRegex, appPackage) => {
    const processDetails = {}
    if (isReleaseLog) {
        processDetails.action = 'RELEASE'
        if(releaseLogVersion && releaseRegex.test(releaseLogVersion)) {
            processDetails.releaseLogVersion = releaseLogVersion
        } else {
            processDetails.releaseLogVersion = appPackage.version
        }
    } else {
        processDetails.action = 'PROMPT_CREATION'
    }
    return processDetails
}

module.exports.addReleaseAndTimeStamp = (entries, version) => {
    const newEntries = _simpleDeepClone(entries)
    newEntries['_release'] = `[${version}]`
    newEntries['_timestamp'] = (new Date()).toLocaleString()
    return newEntries
}

module.exports.initializeFile = (fs, changelogPath) => {
    if (!fs.existsSync(changelogPath)) {
        fs.writeFileSync(changelogPath, '')
    }
    return fs
}

module.exports.fetchExistingFile = (fs, changelogPath, encoding) => {
    return fs.readFileSync(changelogPath, encoding)
}

module.exports.identifyUnreleasedLogs = (currentChangelogMD, markdownRegex) => {
    const result = {}
    const delimiter = '\n'
    const multiSpaceRegex = /\s+/
    let currentLogType = 'NA'
    if (typeof currentChangelogMD === 'string' && currentChangelogMD.length > 0) {
        currentChangelogMD
        .split(delimiter)
        .every(line => {
            // We want to stop when released part of changelog is reached:
            if (markdownRegex.CONTAINS_RELEASE.test(line)) {
                return false
            } 
            // For the unreleased part, we connect log messages to log types:
            if (markdownRegex.H3_HEADER.test(line)) {
                currentLogType = line.split(multiSpaceRegex).length && line.split(multiSpaceRegex)[1] || 'NA'
            } else if (markdownRegex.LIST_ITEM.test(line)) {
                const pushLine = line.replace(markdownRegex.LIST_ITEM, '')
                if (pushLine) {
                    if (result[currentLogType] instanceof Array) {
                        result[currentLogType].push(pushLine)
                    } else {
                        result[currentLogType] = [pushLine]
                    }   
                }
            }
            return true
        })
    }
    return result
}

module.exports.addUnreleasedLogsToEntries = (entries, unreleasedLogs) => {
    const newEntries = _simpleDeepClone(entries)
    for (key in unreleasedLogs) {
        if (key !== 'NA') {
            unreleasedLogs[key].forEach(line => newEntries[key].push(line))
        }
    }
    return newEntries
}

module.exports.generateMarkdownForEntries = (entries, privateKeysInEntries, stringForUnreleasedTag, releaseRegex) => {
    const listItem = '* '
    const h3Header = '### '
    const h2Header = '## '
    const result = []
    const newLineJoin = '\n'
    for (key in entries) {
        if (!privateKeysInEntries.includes(key) && entries[key].length > 0) {
            entries[key].forEach(log => result.push(`${listItem}${log}`))
            result.push(`${h3Header}${key}`)
        }
    }
    if (_doesStringMatchRegex(entries['_release'], releaseRegex)) {
        result.push(`${h2Header}${entries['_release']} - ${entries['_timestamp']}`)
    } else {
        result.push(`${h2Header}${stringForUnreleasedTag}`)
    }
    return result.reverse().join(newLineJoin)
}

module.exports.cleanUpExistingMarkdown = (existingChangelog, markdownRegex, unreleasedTag) => {
    if (_isNonEmptyString(existingChangelog)) {
        const editedLogs = removeUnreleasedLogs(existingChangelog, markdownRegex)
        return removeUnreleasedTag(editedLogs, unreleasedTag)
    }
    return ''
}

module.exports.mergeStrings = (newMD, oldMD, delimiter) => {
    return [newMD, oldMD].join(delimiter)
}

module.exports.writeToFile = (fs, data, changelogPath) => {
    const fd = fs.openSync(changelogPath, 'w+')
    const buffer = new Buffer(data)
    fs.writeSync(fd, buffer, 0, buffer.length, 0) // Write new data
    fs.closeSync(fd)
    return fs
}

module.exports.promptCreation = async (prompt, qCreateCL) => {
    const { createCL } = await prompt(qCreateCL)
    return createCL
}

module.exports.promptTypeOfLog = async (prompt, qTypeOfLog) => {
    const { logType } = await prompt(qTypeOfLog)
    return logType
}

module.exports.promptTypeTheLog = async (prompt, qTypeTheLog) => {
    const { inputForLog } = await prompt(qTypeTheLog)
    return inputForLog
}

module.exports.promptMoreLogs = async (prompt, qMoreLogs) => {
    const { moreLogs } = await prompt(qMoreLogs)
    return moreLogs
}





