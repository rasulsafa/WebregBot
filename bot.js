const Nightmare = require('nightmare')
const vo = require('vo');

const courseCode = "34210";
const username = "...";
const password = "..."

vo(run)();

function *run() {
  var nightmare = Nightmare({show: true});
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

  while(true)
  {
      var authExpired = yield nightmare
      .evaluate(function() {
          var content = document.documentElement.innerHTML;
          return content.includes("Authorization has expired") || content.includes("Please logout and try again");
      })
      .catch(error => {
          console.error('Error:', error)
      });
      while(authExpired)
      {
          console.log("Authorization has failed or expired.... Attempting to login again.")
          nightmare.halt();
          nightmare = Nightmare({show: true}); // workaround to https://github.com/segmentio/nightmare/issues/1349 :(
          yield nightmare
            .goto('https://www.reg.uci.edu/cgi-bin/webreg-redirect.sh')
            .wait("#ucinetid")
            .type('#ucinetid', username)
            .type('#password', password)
            .click('input[name=login_button]')
            .wait(2000)
            .evaluate(function() {
                return !document.documentElement.innerHTML.includes("Add, drop, or change your course enrollment");
            })
            .catch(error => {
                console.error('Error:', error)
                return true;
            });
          if(!authExpired && authExpired !== undefined)
              console.log("Success!")
          else
              console.log("Failed! Trying again...");
      }

      var inMenus = yield nightmare
      .evaluate(function() {
          var content = document.documentElement.innerHTML;
          return content.includes("Add, drop, or change your course enrollment");
      }).catch(error => {
          console.error('Error:', error)
      });
      if(inMenus)
      {
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
      .wait(1000)
      .catch(error => {
          console.error('Error:', error)
      });
  }
}
