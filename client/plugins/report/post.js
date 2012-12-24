// Generated by CoffeeScript 1.4.0
(function() {
  var child, compose, enclose, farm, fetchPage, findPaths, findPubs, findSchedule, fold, fs, header, port, print, ready, report, send,
    __slice = [].slice;

  child = require('child_process');

  fs = require('fs');

  report = require('./report.js');

  print = function() {
    var arg;
    arg = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return console.log.apply(console, arg);
  };

  port = process.env.Port || '';

  farm = process.env.Farm || '../../../data/farm';

  findPaths = function(sufix, done) {
    return child.exec("ls " + farm + "/*/pages/*-" + sufix, function(err, stdout, stderr) {
      return done(stdout.split(/\n/));
    });
  };

  fetchPage = function(path, done) {
    var text;
    return text = fs.readFile(path, 'utf8', function(err, text) {
      return done(JSON.parse(text));
    });
  };

  findSchedule = function(page) {
    var item, _i, _len, _ref;
    _ref = page.story;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      item = _ref[_i];
      if (item.type === 'report') {
        return report.decode(item.text);
      }
    }
    return null;
  };

  findPubs = function(done) {
    return findPaths('report', function(paths) {
      var path, site, slug, x, _ref;
      path = paths[0];
      _ref = path.split('/'), x = _ref[0], x = _ref[1], x = _ref[2], x = _ref[3], x = _ref[4], site = _ref[5], x = _ref[6], slug = _ref[7];
      return fetchPage(path, function(page) {
        var issue, schedule, _i, _len, _ref1, _results;
        if (schedule = findSchedule(page)) {
          _results = [];
          for (_i = 0, _len = schedule.length; _i < _len; _i++) {
            issue = schedule[_i];
            if ((issue.interval != null) && ((_ref1 = issue.recipients) != null ? _ref1.length : void 0)) {
              _results.push(done({
                site: site,
                slug: slug,
                page: page,
                schedule: schedule,
                issue: issue
              }));
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        }
      });
    });
  };

  fold = function(text) {
    return text.match(/(\S*\s*){1,9}/g).join("\n");
  };

  compose = function(page) {
    var item, result, _i, _len, _ref;
    result = [];
    _ref = page.story;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      item = _ref[_i];
      if (item.type === 'paragraph') {
        result.push(fold(item.text));
      }
    }
    return result.join("\n");
  };

  ready = function(_arg) {
    var issue, lapse, now, period, thisIssue, window;
    issue = _arg.issue, now = _arg.now, period = _arg.period;
    window = period * 60 * 1000;
    thisIssue = report.advance(now, issue.interval, 0);
    lapse = now.getTime() - thisIssue.getTime();
    return lapse < window;
  };

  header = function(fields) {
    var k, v;
    return ((function() {
      var _results;
      _results = [];
      for (k in fields) {
        v = fields[k];
        _results.push("" + k + ": " + v);
      }
      return _results;
    })()).join("\n");
  };

  enclose = function(_arg) {
    var issue, page, site, slug, summary;
    site = _arg.site, slug = _arg.slug, page = _arg.page, issue = _arg.issue, summary = _arg.summary;
    return [
      header({
        To: issue.recipients.join(", "),
        'Reply-to': issue.recipients.join(", "),
        Subject: "" + page.title + " (" + issue.interval + ")"
      }), summary, "See details at http://" + site + port + "/" + slug + ".html"
    ].join("\n\n");
  };

  send = function(pub) {
    var output;
    output = [];
    send = child.spawn('/usr/sbin/sendmail', ['-fward@wiki.org', '-t']);
    send.stdin.write(pub.message);
    send.stdin.end();
    send.stderr.setEncoding('utf8');
    send.stderr.on('data', function(data) {
      return output.push(data);
    });
    return send.on('exit', function(code) {
      print("sent " + pub.page.title + " (" + pub.issue.interval + "), code: " + code);
      return print(output);
    });
  };

  findPubs(function(pub) {
    pub.now = new Date(2012, 12 - 1, 21, 0, 0, 3);
    pub.now = new Date();
    pub.period = 10;
    if (ready(pub)) {
      pub.summary = compose(pub.page);
      pub.message = enclose(pub);
      return send(pub);
    }
  });

}).call(this);
