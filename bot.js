const Nightmare = require('nightmare')
const vo = require('vo');

const courseCode = "34210";
const coreqs = ["34211", "34212", "34213", "34214"];

const username = "...";
const password = "...";
const headless = false;
const delayMs = 8000;

vo(run)();

function* run() {
    var nightmare = Nightmare({
        show: !headless
    });
    yield nightmare
        .goto('https://www.reg.uci.edu/cgi-bin/webreg-redirect.sh')
        .wait("#ucinetid")
        .type('#ucinetid', username)
        .type('#password', password)
        .click('input[name=login_button]')
        .wait(2000)
        .catch(error => {
            console.error('Error:', error)
        });

    var courseAdded = false;
    while (!courseAdded) {
        var authExpired = yield nightmare
            .evaluate(function () {
                var content = document.documentElement.innerHTML;
                return content.includes("Authorization has expired") ||
                    content.includes("Please logout and try again") ||
                    content.includes("maximum login time exceeded");
            })
            .catch(error => {
                console.error('Error:', error)
            });
        while (authExpired) {
            console.log("Authorization has failed or expired.... Attempting to login again.")
            nightmare.halt();
            nightmare = Nightmare({
                show: !headless
            }); // workaround to https://github.com/segmentio/nightmare/issues/1349 :(
            authExpired = yield nightmare
                .goto('https://www.reg.uci.edu/cgi-bin/webreg-redirect.sh')
                .wait("#ucinetid")
                .type('#ucinetid', username)
                .type('#password', password)
                .click('input[name=login_button]')
                .wait(2000)
                .evaluate(function () {
                    return !document.documentElement.innerHTML.includes("Add, drop, or change your course enrollment");
                })
                .catch(error => {
                    console.error('Error:', error)
                    return true;
                });
            if (!authExpired && authExpired !== undefined)
                console.log("Success! Logged back in at " + new Date());
            else
                console.log("Failed! Trying again...");
        }

        var inMenus = yield nightmare
            .evaluate(function () {
                var content = document.documentElement.innerHTML;
                return content.includes("Add, drop, or change your course enrollment");
            }).catch(error => {
                console.error('Error:', error)
            });
        if (inMenus) {
            yield nightmare
                .wait('input[value=\'Enrollment Menu\']')
                .click('input[value=\'Enrollment Menu\']')
                .catch(error => {
                    console.error('Error:', error)
                });
        }

        yield nightmare
            .wait('#add')
            .click('#add')
            .type('input[name=courseCode]', courseCode)
            .click('input[value=\'Send Request\']')
            .wait(delayMs)
            .catch(error => {
                console.error('Error:', error)
            });

        var courseAdded = yield nightmare
            .evaluate(function () {
                var content = document.documentElement.innerHTML;
                return content.includes("You must successfully enroll in all");
            }).catch(error => {
                console.error('Error:', error)
                return false;
            });

        if (courseAdded) {
            console.log("Lecture successfully added!\nAttempting to add discussions...");
            var discussionAdded = false;
            while(!discussionAdded) {
                for (var i = 0; i < coreqs.length && !discussionAdded; i++) {
                    discussionAdded = yield nightmare
                        .wait('#add')
                        .click('#add')
                        .wait(1000)
                        .type('input[name=courseCode]', coreqs[i])
                        .wait(1000)
                        .click('input[value=\'Send Request\']')
                        .wait(1000)
                        .evaluate(function () {
                            var content = document.documentElement.innerHTML;
                            return content.includes("you have added");
                        })
                        .catch(error => {
                            console.error('Error:', error)
                        });
                }
            }
            console.log("Discussion successfully added! You are now enrolled!");
        }
    }
}
