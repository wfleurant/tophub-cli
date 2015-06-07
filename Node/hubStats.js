#!/usr/bin/env node
/* -*- Mode:Js */
/* vim: set expandtab ts=4 sw=4: */

var Cjdns       = require('/path/to/cjdns/contrib/nodejs/cjdnsadmin/cjdnsadmin');
var PublicToIp6 = require('/path/to/cjdns/tools/lib/publicToIp6');
var http        = require('http');

var scrape_variables = function() {
  psArray = [];
  // unused var 'mytoken' for oauth posts (anti-xss)
  mytoken = 'E8DfGoV0FHX9oCdTDJ8T';
  // unused var 'myip'
  myip = 'fc00::1';
};

function post_node_update(json) {

  scrape_variables();
  // not official.
  var post_data = { peerstats: json };

  // readyfication of post data
  post_data = JSON.stringify(post_data);

  console.log('\npost_node_update(json): %s\n', post_data);

  var post_options = {
      host: 'fc00::1',
      port: '8000',
      path: '/api/v0/node/update.json',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(post_data)
      }
  };
  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          console.log('Response: ' + chunk);
      });
  });

  post_req.addListener('error', function(connectionException){
      if (connectionException.errno === process.ECONNREFUSED) {
          console.log('ECONNREFUSED: connection refused to '
              +connection.host
              +':'
              +connection.port);
      } else {
          console.log(connectionException);
      }
  });

  post_req.addListener('response', function(response){
      var data = '';

      response.addListener('data', function(chunk){
          data += chunk;
      });
      response.addListener('end', function(){
          // Do something with data.
      });
  });


  post_req.write(post_data);
  post_req.end();

}

Cjdns.connectAsAnon(function (cjdns) {

    scrape_variables();

    var again = function (i) {
        cjdns.InterfaceController_peerStats(i, function (err, ret) {
            if (err) { throw err; }
            ret.peers.forEach(function (peer, idx) {
                p = peer['addr'] + ' ' + peer['state'] +
                    ' in ' + peer['bytesIn'] + ' out ' + peer['bytesOut'];

                    if (Number(peer['duplicates']) !== 0) {
                        p += ' ' + ' DUP ' + peer['duplicates'];
                    }
                    if (Number(peer['lostPackets']) !== 0) {
                        p += ' ' + ' LOS ' + peer['lostPackets'];
                    }
                    if (Number(peer['receivedOutOfRange']) !== 0) {
                        p += ' ' + ' OOR ' + peer['receivedOutOfRange'];
                    }

                if (typeof(peer.user) === 'string') {
                    p += ' "' + peer['user'] + '"';
                }

                psArray[idx] = {
                  version: p.split(/\./g)[0],
                  label:
                    p.split(/\./g)[1] + "." + p.split(/\./g)[2] + "." +
                    p.split(/\./g)[3] + "." + p.split(/\./g)[4],
                  pubkey: p.split(/\./g)[5] + '.k',
                  state: p.split(/\ /g)[1],
                  bytesin: p.split(/\ /g)[3],
                  bytesout: p.split(/\ /g)[5]
                }

            });
            if (typeof(ret.more) !== 'undefined') {
                again(i+1);
            } else {
                cjdns.disconnect();
                post_node_update(psArray);
            }
        });
    };
    again(0);
});
