var fs    = require( 'fs' ),
	jconv = require( __dirname + '/../' );

var inputPath  = __dirname + '/input/ALL/',
	outputPath = __dirname + '/output/';

var internalEncoding = {
	'UNICODE': 'UCS2',
	'UTF8':    'UTF8',
	'SJIS':    'BINARY',
	'EUCJP':   'BINARY',
	'JIS':     'BINARY'
};

function convertTest( from, to ) {
	var FROM = from.toUpperCase(),
		TO   = to.toUpperCase();

	console.log( '[ ' + FROM + ' -> ' + TO + ' ]' );

	var buffer = fs.readFileSync( inputPath + FROM + '.TXT' );

	var converted = jconv.convert( buffer, FROM, TO );

	console.log( converted.toString( internalEncoding[ TO ] ) );

	fs.writeFileSync( outputPath + FROM + '-' + TO + '.TXT', converted );

	return converted;
}

convertTest( 'UTF8', 'SJIS' );
convertTest( 'UTF8', 'JIS' );
convertTest( 'UTF8', 'EUCJP' );

convertTest( 'SJIS', 'UTF8' );
convertTest( 'SJIS', 'JIS' );
convertTest( 'SJIS', 'EUCJP' );

convertTest( 'JIS', 'UTF8' );
convertTest( 'JIS', 'SJIS' );
convertTest( 'JIS', 'EUCJP' );

convertTest( 'EUCJP', 'UTF8' );
convertTest( 'EUCJP', 'SJIS' );
convertTest( 'EUCJP', 'JIS' );

convertTest( 'UTF8', 'UNICODE' );
convertTest( 'UNICODE', 'UTF8' );
