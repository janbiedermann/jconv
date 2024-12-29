'use strict';

var fs       = require( 'fs' ),
	  should   = require( 'should' ),
	  jconv    = require( __dirname + '/../' );

function getBuffer( type, name ) {
	var filePath = __dirname + '/input/' + type + '/' + name + '.TXT';
	return fs.readFileSync( filePath );
}

function check( type, to ) {
	var from = 'UNICODE',
      toBuf = getBuffer( type, to ),
	    fromBuf = getBuffer( type, from );

	// jconv
	it( '#' + from + '->' + to, function() {
		var convertedBuf = jconv.convert( fromBuf.toString('utf16le'), to );

		should( convertedBuf.buffer ).eql( toBuf.buffer.slice(0, toBuf.length) );
	});
}

// UNICODE
describe( 'jconv.convert UNICODE', function() {
	check( 'BASIC', 'SJIS' );
	check( 'BASIC', 'JIS' );
	check( 'BASIC', 'EUCJP' );
});
