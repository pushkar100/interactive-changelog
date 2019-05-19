/* Third party imports: */
var should = require('chai').should()
var sinon = require('sinon')

/* Custom imports: */
var utils = require('../../src/utils')
var questions = require('../../src/questions')
var CONFIG = require('../../src/config')

/* Test suites: */
describe('Testing Utils', function() {
    var entries
    var types

    beforeEach(function() {
        entries = {
            _release: '',
            _timestamp: ''
        }
        types = {
            ADDED: 'Added',
            CHANGED: 'Changed',
            DEPRECATED: 'Deprecated',
            REMOVED: 'Removed',
            FIXED: 'Fixed',
            SECURITY: 'Security'
        }
    })

    describe('Testing createTemplate()', function() {
        it('Template should have all the required properties', function() {
            originalEntries = Object.keys(entries)
            entries = utils.createTemplate(entries, types)
            Object.keys(entries).sort().should.deep.equal(Object.values(types).concat(originalEntries).sort())
        })
    })
    
    describe('Testing startProcess()', function() {
        var isReleaseLog
        var releaseLogVersion
        var appPackage

        beforeEach(function() {
            isReleaseLog = true
            releaseLogVersion = '2.11.9'
            appPackage = {
                version: '1.2.1'
            }
        })
        it('Specify prompt for creation if isReleaseLog is false', function() {
            utils.startProcess(false).should.have.property('action').equal('PROMPT_CREATION')
        })
        
        it('Specify action as release with version same as input if isReleaseLog is true', function() {
            var result = utils.startProcess(
                isReleaseLog,
                releaseLogVersion,
                CONFIG.RELEASE_VERSION_REGEX,
                appPackage
            )
            result.should.have.property('action').equal('RELEASE')
            result.should.have.property('releaseLogVersion').equal(releaseLogVersion)
        })

        it('Specify releaseLogVersion with package version if regex for input version fails', function() {
            releaseLogVersion = '1.0.1.1'
            
            var result = utils.startProcess(
                isReleaseLog,
                releaseLogVersion,
                CONFIG.RELEASE_VERSION_REGEX,
                appPackage
            )
            result.should.have.property('action').equal('RELEASE')
            result.should.have.property('releaseLogVersion').equal(appPackage.version)
        })
    })

    describe('Testing addReleaseAndTimeStamp()', function() {
        var entries
        var version

        beforeEach(function() {
            entries = {}
            version = '1.0.1'
        })

        it('Must return the passed in release version and timestamp (Date localeString)', function() {
            var result = utils.addReleaseAndTimeStamp(entries, version)
            var localeStringRegex = /(\d+\/\d+\/\d+).*(\d+\:\d+\:\d+).*(AM|PM)/
            result.should.have.property('_release').equal(`[${version}]`)
            result.should.have.property('_timestamp').to.match(localeStringRegex)
        })
    })

    describe('Testing initializeFile()', function() {
        var fs
        var changelogPath

        beforeEach(function() {
            fs = {
                existsSync: function() {},
                writeSync: function() {},
                readFileSync: function() {}
            }
            changelogPath = './CHANGELOG.md'
        })

        it('Do not write to file (create) if file exists', function() {
            sinon.stub(fs, 'existsSync').returns(true)
            fs.writeFileSync = sinon.spy()
            utils.initializeFile(fs, changelogPath)
            fs.writeFileSync.notCalled.should.be.true
        })

        it('Write file once (create) if file does not exist', function() {
            sinon.stub(fs, 'existsSync').returns(false)
            fs.writeFileSync = sinon.spy()
            utils.initializeFile(fs, changelogPath)
            fs.writeFileSync.calledOnce.should.be.true
        })
    })

    describe('Testing fetchExistingFile()', function() {
        var fs
        var changelogPath

        beforeEach(function() {
            fs = {
                existsSync: function() {},
                writeSync: function() {},
                readFileSync: function() {}
            }
            changelogPath = './CHANGELOG.md'
        })

        it('Must read the file once and return the data', function() {
            var data = "Some data from file"
            fs.readFileSync = sinon.stub().returns(data)
            var result = utils.fetchExistingFile(fs, changelogPath, CONFIG.ENCODING)
            fs.readFileSync.calledOnce.should.be.true
            result.should.equal(data)
        })
    })

    describe('Testing identifyUnreleasedLogs()', function() {
        var currentChangelogMD

        before(function() {
            var fileSystem = require('fs')
            currentChangelogMD = fileSystem.readFileSync('./test/data/sample-changelog.md', CONFIG.ENCODING)
            emptyChangelogMD = fileSystem.readFileSync('./test/data/empty-changelog.md', CONFIG.ENCODING)
            onlyReleasedlogMD = fileSystem.readFileSync('./test/data/only-released-changelog.md', CONFIG.ENCODING)
        })

        it('Identify all the unreleased logs and return an object', function() {
            utils.identifyUnreleasedLogs(currentChangelogMD, CONFIG.MARKDOWN_REGEX)
                .should.be.an('object')
        })

        it('Identify all the unreleased logs of a particular log type when logs for it exist', function() {
            var expectedAddedArray = ['Something different', 'Blah blah 222', 'Random msg']
            utils.identifyUnreleasedLogs(currentChangelogMD, CONFIG.MARKDOWN_REGEX)
                .should.have.property('Added').deep.equal(expectedAddedArray)
        })

        it('Return empty object when existing changelog data is empty', function() {
            var expectedReturn = {}
            utils.identifyUnreleasedLogs(emptyChangelogMD, CONFIG.MARKDOWN_REGEX)
                .should.deep.equal(expectedReturn)
        })

        it('Return empty object when existing changelog data has no unreleased logs', function() {
            var expectedReturn = {}
            utils.identifyUnreleasedLogs(onlyReleasedlogMD, CONFIG.MARKDOWN_REGEX)
                .should.deep.equal(expectedReturn)
        })
    })

    describe('Testing addUnreleasedLogsToEntries()', function() {
        var entries
        var unreleasedLogs 

        before(function() {
            entries = {
                _release: '',
                _timestamp: '',
                Added: [ 'Added existing'],
                Changed: [ 'Changes existing' ],
                Deprecated: [],
                Removed: [],
                Fixed: [],
                Security: []
            }
            unreleasedLogs = { 
                Added: [ 'New 1', 'New 2', 'New 3' ],
                Changed: [ 'Different 1' ],
                Removed: [ 'Old 1' ]
            }
        })

        it('Must combine entries and unreleased logs\' objects', function() {
            var expectedAdded = [ 'Added existing', 'New 1', 'New 2', 'New 3' ]
            var expectedChanged = [ 'Changes existing', 'Different 1' ]
            var expectedRemoved = [ 'Old 1' ]
            var result = utils.addUnreleasedLogsToEntries(entries, unreleasedLogs)

            result.should.have.property('Added').to.have.length(4)
            result.should.have.property('Changed').to.have.length(2)
            result.should.have.property('Removed').to.have.length(1)

            result.should.have.property('Added').deep.equal(expectedAdded)
            result.should.have.property('Changed').deep.equal(expectedChanged)
            result.should.have.property('Removed').deep.equal(expectedRemoved)
        })
    })

    describe('Testing generateMarkdownForEntries()', function() {
        var entries
        var unreleasedLogs 
        var privateKeysInEntries

        before(function() {
            entries = {
                _release: '',
                _timestamp: '',
                Added: [ 'Added existing', 'Added existing #2' ],
                Changed: [ 'Changes existing' ],
                Deprecated: [ 'Deprecated existing', 'Deprecated existing @2' ],
                Removed: [],
                Fixed: [],
                Security: []
            }
            privateKeysInEntries = ['_release', '_timestamp']
        })

        it('Must include a markdown list item for each log in entry', function() {
            var result = utils.generateMarkdownForEntries(
                entries,
                privateKeysInEntries,
                CONFIG.MARKDOWN.UNRELEASED_TAG, 
                CONFIG.MARKDOWN_REGEX.RELEASE
            )

            result.should.have.string('### Added')
            result.should.have.string(`* ${entries['Added'][0]}`)
            result.should.have.string(`* ${entries['Added'][1]}`)
            result.should.have.string('### Changed')
            result.should.have.string(`* ${entries['Changed'][0]}`)
            result.should.have.string('### Deprecated')
            result.should.have.string(`* ${entries['Deprecated'][0]}`)
            result.should.have.string(`* ${entries['Deprecated'][1]}`)
        })

        it('Must include unreleased version heading (h2) if no version in entries passed to it', function() {
            var result = utils.generateMarkdownForEntries(
                entries,
                privateKeysInEntries,
                CONFIG.MARKDOWN.UNRELEASED_TAG,
                CONFIG.MARKDOWN_REGEX.RELEASE
            )
            result.should.have.string(`## ${CONFIG.MARKDOWN.UNRELEASED_TAG}`)
        })

        it('Must include release version heading (h2) if present in entries\' object', function() {
            entries['_release'] = '[1.2.23]'
            entries['_timestamp'] = (new Date()).toLocaleString()
            var result = utils.generateMarkdownForEntries(
                entries,
                privateKeysInEntries,
                CONFIG.MARKDOWN.UNRELEASED_TAG,
                CONFIG.MARKDOWN_REGEX.RELEASE
            )
            result.should.have.string(`## ${entries['_release']} - ${entries['_timestamp']}`)
        })
    })

    describe('Testing cleanUpExistingMarkdown()', function() {
        var currentChangelogMD

        before(function() {
            var fileSystem = require('fs')
            currentChangelogMD = fileSystem.readFileSync('./test/data/sample-changelog.md', CONFIG.ENCODING)
            emptyChangelogMD = fileSystem.readFileSync('./test/data/empty-changelog.md', CONFIG.ENCODING)
            onlyReleasedlogMD = fileSystem.readFileSync('./test/data/only-released-changelog.md', CONFIG.ENCODING)
        })

        it('Must return empty string if existing changelog data is empty', function() {
            var result = utils.cleanUpExistingMarkdown(
                emptyChangelogMD, 
                CONFIG.MARKDOWN_REGEX, 
                CONFIG.MARKDOWN.UNRELEASED_TAG
            )
            result.should.equal('')
        })

        it('Must return remove unreleased logs & unreleased tag', function() {
            var delimiter = '\n'
            var result = utils.cleanUpExistingMarkdown(
                currentChangelogMD, 
                CONFIG.MARKDOWN_REGEX, 
                CONFIG.MARKDOWN.UNRELEASED_TAG
            )
            result.should.not.have.string('## [Unreleased]')
            result.split(delimiter)[0].should.match(/\[\d+.\d+.\d+\]/)
        })
    })

    describe('Testing mergeStrings()', function() {
        var str1 = `aaa\nbbb\nccc`
        var str2 = `ddd\neee\nfff`

        it('Must return merged string with delimiter in between', function() {
            var result = utils.mergeStrings(str1, str2, '\n')
            result.should.equal(`${str1}\n${str2}`)
        })
    })

    describe('Testing writeToFile()', function() {
        var fs

        before(function() {
            fs = {
                openSync: sinon.spy(),
                writeSync: sinon.spy(),
                closeSync: sinon.spy()
            }
        })

        it('Must open, write, and close file (in that order)', function() {
            var data = "Some data"
            var changelogPath = "./some/file/path"
            
            utils.writeToFile(fs, data, changelogPath)

            fs.openSync.calledBefore(fs.writeSync).should.be.true
            fs.openSync.calledBefore(fs.closeSync).should.be.true

            fs.openSync.calledOnce.should.be.true
            fs.writeSync.calledOnce.should.be.true
            fs.closeSync.calledOnce.should.be.true
        })
    })

    describe('Testing promptCreation()', function() {
        var prompt

        beforeEach(function() {
            prompt = function() {
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        resolve({
                            createCL: true
                        })
                    }, 500)
                })
            }
        })

        it('Return the boolean choice of the user', function(done) {
            utils.promptCreation(prompt, questions.qCreateCL())
                .then(function(data) {
                    data.should.be.a('boolean')
                    done()
                })
        })
    })

    describe('Testing promptTypeOfLog()', function() {
        var prompt
        var types
        var additionalChoices

        beforeEach(function() {
            prompt = function() {
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        resolve({
                            logType: 'Added'
                        })
                    }, 500)
                })
            }
            types = {
                ADDED: 'Added',
                CHANGED: 'Changed',
                DEPRECATED: 'Deprecated',
                REMOVED: 'Removed',
                FIXED: 'Fixed',
                SECURITY: 'Security'
            }
            additionalChoices = {
                BULK_EDIT: 'BULK EDIT IN EDITOR',
                EXIT: 'EXIT!'
            }
        })

        it('Return the log type choice of the user', function(done) {
            var finalOptions = Object.assign({}, types, additionalChoices)
            utils.promptTypeOfLog(prompt, questions.qTypeOfLog(finalOptions))
                .then(function(data) {
                    data.should.equal('Added')
                    done()
                })
        })
    })

    describe('Testing promptTypeTheLog()', function() {
        var prompt

        beforeEach(function() {
            prompt = function() {
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        resolve({
                            inputForLog: 'Sample log message'
                        })
                    }, 500)
                })
            }
        })

        it('Return the log messaged typed by the user', function(done) {
            utils.promptTypeTheLog(prompt, questions.qTypeTheLog(CONFIG.LOG_MESSAGE_LIMIT))
                .then(function(data) {
                    data.should.equal('Sample log message')
                    done()
                })
        })
    })

    describe('Testing promptMoreLogs()', function() {
        var prompt

        beforeEach(function() {
            prompt = function() {
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        resolve({
                            moreLogs: true
                        })
                    }, 500)
                })
            }
        })

        it('Return boolean choice of the user for more logs', function(done) {
            utils.promptMoreLogs(prompt, questions.qMoreLogs())
                .then(function(data) {
                    data.should.equal(true)
                    done()
                })
        })
    })
})