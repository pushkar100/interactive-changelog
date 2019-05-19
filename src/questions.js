module.exports.qCreateCL = () => {
    return  {
        type: 'confirm',
        name: 'createCL',
        message: 'Create/Edit a CHANGELOG?'
    }
}

module.exports.qTypeOfLog = types => {
    return {
        type: 'list',
        name: "logType",
        message: "Type of log?",
        choices: Object.values(types)
    }
}

module.exports.qTypeTheLog = logMessageLimit => {
    return {
        type: 'input',
        name: 'inputForLog',
        message: 'Log message:',
        validate(input) {
            if(input.length > logMessageLimit) {
                return 'Sorry, log message is too long!'
            }
            return true
        }
    }
}

module.exports.qMoreLogs = () => {
    return {
        type: 'confirm',
        name: 'moreLogs',
        message: 'Set more logs?'
    }
}