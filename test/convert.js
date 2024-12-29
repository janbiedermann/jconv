'use strict';

var fs    = require( 'fs' ),
	  jconv = require( __dirname + '/../' );

var inputPath  = __dirname + '/input/ALL/',
	outputPath = __dirname + '/converted/';

var internalEncoding = {
	'SJIS':    'BINARY',
	'EUCJP':   'BINARY',
	'JIS':     'BINARY'
};

function convertTest( to ) {
	var FROM = 'UNICODE',
    	TO   = to.toUpperCase();

	console.log( '[ -> ' + TO + ' ]' );

	var buffer = fs.readFileSync( inputPath + FROM + '.TXT' );

	var converted = jconv.convert( buffer.toString(), TO );

	console.log( converted.toString( internalEncoding[ TO ] ) );

	fs.writeFileSync( outputPath + FROM + '-' + TO + '.TXT', converted );

	return converted;
}

// Unicode
convertTest( 'SJIS' );
convertTest( 'JIS' );
convertTest( 'EUCJP' );
