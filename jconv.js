/*! ------------------------------------------------------

	Jconv

	Copyright (c) 2013-2014 narirou
	MIT Licensed

------------------------------------------------------- */

import SJISInverted from './tables/SJISInverted.js';
import JISInverted from './tables/JISInverted.js';
import JISEXTInverted from './tables/JISEXTInverted.js';

var unknown = '・'.charCodeAt( 0 );

var encodings = {__proto__: null};

function defineEncoding( obj ) {
	var Encoding = function( obj ) {
		this.name = obj.name;
		this.convert = obj.convert;
	};
	encodings[ obj.name ] = new Encoding( obj );
};

function getName( name ) {
	switch( name.toUpperCase() ) {
		case 'CP932':
		case 'SJIS':
		case 'SHIFTJIS':
		case 'SHIFT_JIS':
    case 'WINDOWS-31J':
			return 'SJIS';
		case 'EUCJP':
		case 'EUC-JP':
			return 'EUCJP';
		case 'JIS':
		case 'ISO2022JP':
		case 'ISO-2022-JP':
		case 'ISO-2022-JP-1':
			return 'JIS';
		default:
			throw new Error( 'Encoding not recognized.' );
	}
}

// UCS2 = UTF16LE(no-BOM)
// UCS2 -> SJIS
defineEncoding({
	name: 'UCS2toSJIS',

	convert: function( str ) {
		let unknownSjis = SJISInverted[ unknown ],
				sjisBuf     = new Uint8Array(str.length * 2), // max 2 bytes per char
				offset      = 0,
				unicode;

		for( const c of str ) {
			unicode = c.codePointAt(0);

			// ASCII
			if( unicode < 0x80 ) {
				sjisBuf[ offset++ ] = unicode;
			}
			// HALFWIDTH_KATAKANA
			else if( 0xFF61 <= unicode && unicode <= 0xFF9F ) {
				sjisBuf[ offset++ ] = unicode - 0xFEC0 ;
			}
			// KANJI
			else {
				let code = SJISInverted[ unicode ] || unknownSjis;
				sjisBuf[ offset++ ] = code >> 8 ;
				sjisBuf[ offset++ ] = code & 0xFF ;
			}
		}
		return (offset < sjisBuf.byteLength) ? sjisBuf.slice( 0, offset ) : sjisBuf;
	}
});

// UCS2 -> JIS
defineEncoding({
	name: 'UCS2toJIS',

	convert: function( str ) {
		let unknownJis = JISInverted[ unknown ],
				jisBuf     = new Uint8Array( str.length * 4 ), // max 4 bytes per char
				offset     = 0,
				sequence   = 0,
				unicode;

		for( const c of str ) {
			unicode = c.codePointAt(0);

			// ASCII
			if( unicode < 0x80 ) {
				if( sequence !== 0 ) {
					sequence = 0;
					jisBuf[ offset++ ] = 0x1B;
					jisBuf[ offset++ ] = 0x28;
					jisBuf[ offset++ ] = 0x42;
				}
				jisBuf[ offset++ ] = unicode;
			}
			// HALFWIDTH_KATAKANA
			else if( 0xFF61 <= unicode && unicode <= 0xFF9F ) {
				if( sequence !== 1 ) {
					sequence = 1;
					jisBuf[ offset++ ] = 0x1B;
					jisBuf[ offset++ ] = 0x28;
					jisBuf[ offset++ ] = 0x49;
				}
				jisBuf[ offset++ ] = unicode - 0xFF40;
			}
			else {
				var code = JISInverted[ unicode ];
				if( code ) {
					// KANJI
					if( sequence !== 2 ) {
						sequence = 2;
						jisBuf[ offset++ ] = 0x1B;
						jisBuf[ offset++ ] = 0x24;
						jisBuf[ offset++ ] = 0x42;
					}
					jisBuf[ offset++ ] = code >> 8;
					jisBuf[ offset++ ] = code & 0xFF;
				}
				else {
					var ext = JISEXTInverted[ unicode ];
					if( ext ) {
						// EXTENSION
						if( sequence !== 3 ) {
							sequence = 3;
							jisBuf[ offset++ ] = 0x1B;
							jisBuf[ offset++ ] = 0x24;
							jisBuf[ offset++ ] = 0x28;
							jisBuf[ offset++ ] = 0x44;
						}
						jisBuf[ offset++ ] = ext >> 8;
						jisBuf[ offset++ ] = ext & 0xFF;
					}
					else {
						// UNKNOWN
						if( sequence !== 2 ) {
							sequence = 2;
							jisBuf[ offset++ ] = 0x1B;
							jisBuf[ offset++ ] = 0x24;
							jisBuf[ offset++ ] = 0x42;
						}
						jisBuf[ offset++ ] = unknownJis >> 8;
						jisBuf[ offset++ ] = unknownJis & 0xFF;
					}
				}
			}
		}

		// Add ASCII ESC
		if( sequence !== 0 ) {
			sequence = 0;
			jisBuf[ offset++ ] = 0x1B;
			jisBuf[ offset++ ] = 0x28;
			jisBuf[ offset++ ] = 0x42;
		}
		return (offset < jisBuf.byteLength) ? jisBuf.slice( 0, offset ) : jisBuf;
	}
});

// UCS2 -> EUCJP
defineEncoding({
	name: 'UCS2toEUCJP',

	convert: function( str ) {
		let unknownJis = JISInverted[ unknown ],
				len        = str.length,
				eucBuf     = new Uint8Array( len * 3 ), // max 3 bytes per char
				offset     = 0,
				unicode;

		for( const c of str ) {
			unicode = c.codePointAt(0);

			// ASCII
			if( unicode < 0x80 ) {
				eucBuf[ offset++ ] = unicode;
			}
			// HALFWIDTH_KATAKANA
			else if( 0xFF61 <= unicode && unicode <= 0xFF9F ) {
				eucBuf[ offset++ ] = 0x8E;
				eucBuf[ offset++ ] = unicode - 0xFFC0;
			}
			else {
				// KANJI
				var jis = JISInverted[ unicode ];
				if( jis ) {
					eucBuf[ offset++ ] = ( jis >> 8 ) - 0x80;
					eucBuf[ offset++ ] = ( jis & 0xFF ) - 0x80;
				}
				else {
					// EXTENSION
					var ext = JISEXTInverted[ unicode ];
					if( ext ) {
						eucBuf[ offset++ ] = 0x8F;
						eucBuf[ offset++ ] = ( ext >> 8 ) - 0x80;
						eucBuf[ offset++ ] = ( ext & 0xFF ) - 0x80;
					}
					// UNKNOWN
					else {
						eucBuf[ offset++ ] = ( unknownJis >> 8 ) - 0x80;
						eucBuf[ offset++ ] = ( unknownJis & 0xFF ) - 0x80;
					}
				}
			}
		}
		return (offset < eucBuf.byteLength) ? eucBuf.slice( 0, offset ) : eucBuf;
	}
});

export function convert( str, to ) {
	let encoder = encodings[ 'UCS2to' + getName( to )];
  return encoder.convert( str );
};
