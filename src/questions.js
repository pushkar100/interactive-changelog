const qCreateCL = () => {
  return  {
    type: 'confirm',
    name: 'createCL',
    message: 'Create/Edit a CHANGELOG?'
  }
}

const qTypeOfLog = types => {
  return {
    type: 'list',
    name: "logType",
    message: "Type of log?",
    choices: Object.values(types)
  }
}

const qTypeTheLog = logMessageLimit => {
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

const qMoreLogs = () => {
  return {
    type: 'confirm',
    name: 'moreLogs',
    message: 'Set more logs?'
  }
}

const questions = {
  qCreateCL,
  qTypeOfLog,
  qTypeTheLog,
  qMoreLogs
}

export default questions
