'use strict';

var fs        = require( 'fs' ),
    Benchmark = require( 'benchmark' ),
    jconv     = require( __dirname + '/../jconv' ),
    Iconv     = require( 'iconv' ).Iconv;

var inputPath  = __dirname + '/input/KOKORO/',
	chartPath  = __dirname + '/chart/';

var fixEncoding = {
	'SJIS':    'CP932',
	'JIS':     'ISO-2022-JP-1',
	'UNICODE': 'UTF16LE'
};

var logs = {};

var logText = '';

function speedTest( to ) {
	var FROM    = 'UNICODE',
		  TO      = to.toUpperCase(),
		  fixFROM = fixEncoding[ FROM ] || FROM,
		  fixTO   = fixEncoding[ TO ] || TO;

	var _jconv  = jconv;
	var _iconv  = new Iconv( fixFROM, fixTO + '//TRANSLIT//IGNORE' );

	var buffer  = fs.readFileSync( inputPath + FROM + '.TXT' );
  var buf_str = buffer.toString();
	var title   = '[ ' + FROM + ' -> ' + TO + ' ]';

	log( title );

	var suite = new Benchmark.Suite;
	suite
		.add( 'jconv', function() {
			_jconv.convert( buf_str, TO );
		})
		.add( 'iconv', function() {
			_iconv.convert( buf_str );
		})
		.on( 'cycle', function( event ) {
			log( String( event.target ) );
		})
		.on( 'complete', function() {
			var text = 'Fastest is ' + this.filter( 'fastest' ).pluck( 'name' );
			var results = this.filter( 'successful' );
			var logData = {};

			for( var i = 0, len = results.length; i < len; i++ ) {
				var result = results[ i ];
				logData[ result.name ] = result.hz;
			}
			logs[ title ] = logData;

			log( text );
		})
		.run({
			async: false
		});
}

function log( text ) {
	logText += text + '\n';
	console.log( text );
}

function writeLog() {
	var outputString = 'var speedLog = \'' + JSON.stringify( logs ) + '\';';
	fs.writeFileSync( chartPath + 'speedLog.js', outputString );
	fs.writeFileSync( chartPath + 'speedLog.txt', logText );
}

// Unicode
speedTest( 'SJIS' );
speedTest( 'JIS' );
speedTest( 'EUCJP' );

writeLog();
