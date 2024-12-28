/*! ------------------------------------------------------

	Jconv

	Copyright (c) 2013-2014 narirou
	MIT Licensed

------------------------------------------------------- */

import SJIS from './tables/SJIS';
import JIS from './tables/JIS';
import JISEXT from './tables/JISEXT';
import SJISInverted from './tables/SJISInverted';
import JISInverted from './tables/JISInverted';
import JISEXTInverted from './tables/JISEXTInverted';

var unknown = '・'.charCodeAt( 0 );

var encodings = {};

var jconv = module.exports = function( buf, to ) {
	return jconv.convert( buf, to );
};

jconv.defineEncoding = function( obj ) {
	var Encoding = function( obj ) {
		this.name = obj.name;
		this.convert = obj.convert;
	};
	encodings[ obj.name ] = new Encoding( obj );
};

jconv.convert = function( str, to ) {
	let from = 'UTF8';
	to = getName( to );

	if( ! to ) { throw new Error( 'Encoding not recognized.' ); }

	let text_encoder = new TextEncoder();
	let buf = text_encoder.encode(str);

	// Directly convert if possible.
	let encoder = encodings[ from + 'to' + to ];
	if( encoder ) {
		return encoder.convert( buf );
	}

	let uniDecoder = encodings[ from + 'toUCS2' ],
		uniEncoder = encodings[ 'UCS2to' + to ];
	if( uniDecoder && uniEncoder ) {
		return uniEncoder.convert( uniDecoder.convert( buf ) );
	}
	else {
		throw new Error( 'Encoding not recognized.' );
	}
};

jconv.encode = jconv.convert

function getName( name ) {
	switch( name.toUpperCase() ) {
		case 'WINDOWS-31J':
		case 'CP932':
		case 'SJIS':
		case 'SHIFTJIS':
		case 'SHIFT_JIS':
			return 'SJIS';
		case 'EUCJP':
		case 'EUC-JP':
			return 'EUCJP';
		case 'JIS':
		case 'ISO2022JP':
		case 'ISO-2022-JP':
		case 'ISO-2022-JP-1':
			return 'JIS';
		case 'UTF8':
		case 'UTF-8':
			return 'UTF8';
		case 'UNICODE':
		case 'UCS2':
		case 'UCS-2':
		case 'UTF16LE':
		case 'UTF-16LE':
			return 'UCS2';
		default:
			return '';
	}
}

// Unicode CharCode -> UTF8 Buffer
function setUtf8Buffer( unicode, utf8Buffer, offset ) {
	if( unicode < 0x80 ) {
		utf8Buffer.setUint8( offset++ , unicode );
	}
	else if( unicode < 0x800 ) {
		utf8Buffer.setUint8( offset++ , 0xC0 | unicode >>>  6        );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode        & 0x3F );
	}
	else if( unicode < 0x10000 ) {
		utf8Buffer.setUint8( offset++ , 0xE0 | unicode >>> 12        );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode >>>  6 & 0x3F );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode        & 0x3F );
	}
	else if( unicode < 0x200000 ) {
		utf8Buffer.setUint8( offset++ , 0xF0 | unicode >>> 18        );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode >>> 12 & 0x3F );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode >>>  6 & 0x3F );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode        & 0x3F );
	}
	else if( unicode < 0x4000000 ) {
		utf8Buffer.setUint8( offset++ , 0xF8 | unicode >>> 24        );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode >>> 18 & 0x3F );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode >>> 12 & 0x3F );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode >>>  6 & 0x3F );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode        & 0x3F );
	}
	else {
		// ( >>>32 ) is not possible in ECMAScript. So use ( /0x40000000 ).
		utf8Buffer.setUint8( offset++ , 0xFC | unicode  / 0x40000000 );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode >>> 24 & 0x3F );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode >>> 18 & 0x3F );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode >>> 12 & 0x3F );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode >>>  6 & 0x3F );
		utf8Buffer.setUint8( offset++ , 0x80 | unicode        & 0x3F );
	}
	return offset;
}

function setUnicodeBuffer( unicode, unicodeBuffer, offset ) {
	unicodeBuffer.setUint8( offset++ , unicode & 0xFF );
	unicodeBuffer.setUint8( offset++ , unicode >> 8 );
	return offset;
}

// UCS2 = UTF16LE(no-BOM)
// UCS2 -> UTF8
jconv.defineEncoding({
	name: 'UCS2toUTF8',

	convert: function( buf ) {
		let len     = buf.length,
				utf8Buf = new DataView(new ArrayBuffer( len * 3 )),
				offset  = 0,
				unicode;

		for( let i = 0; i < len; ) {
			let byte1 = buf.getUint8( i++ ),
					byte2 = buf.getUint8( i++ );

			unicode = ( byte2 << 8 ) + byte1;

			offset = setUtf8Buffer( unicode, utf8Buf, offset );
		}
		return utf8Buf.slice( 0, offset );
	}
});

// UCS2 -> SJIS
jconv.defineEncoding({
	name: 'UCS2toSJIS',

	convert: function( buf ) {
		let unknownSjis = SJISInverted[ unknown ],
				len         = buf.length,
				sjisBuf     = new DataView(new ArrayBuffer( len )),
				offset      = 0,
				unicode;

		for( let i = 0; i <len; ) {
			let byte1 = buf.getUint8( i++ ),
					byte2 = buf.getUint8( i++ );

			unicode = ( byte2 << 8 ) + byte1;

			// ASCII
			if( unicode < 0x80 ) {
				sjisBuf.setUint8( offset++ , unicode );
			}
			// HALFWIDTH_KATAKANA
			else if( 0xFF61 <= unicode && unicode <= 0xFF9F ) {
				sjisBuf.setUint8( offset++ , unicode - 0xFEC0 );
			}
			// KANJI
			else {
				let code = SJISInverted[ unicode ] || unknownSjis;
				sjisBuf.setUint8( offset++ , code >> 8 );
				sjisBuf.setUint8( offset++ , code & 0xFF );
			}
		}
		return sjisBuf.slice( 0, offset );
	}
});

// UCS2 -> JIS
jconv.defineEncoding({
	name: 'UCS2toJIS',

	convert: function( buf ) {
		let unknownJis = JISInverted[ unknown ],
				len        = buf.length,
				jisBuf     = new DataView(new ArrayBuffer( len * 3 + 4 )),
				offset     = 0,
				sequence   = 0,
				unicode;

		for( let i = 0; i < len; ) {
			let byte1 = buf.getUint8( i++ ),
					byte2 = buf.getUint8( i++ );

			unicode = ( byte2 << 8 ) + byte1;

			// ASCII
			if( unicode < 0x80 ) {
				if( sequence !== 0 ) {
					sequence = 0;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x28 );
					jisBuf.setUint8( offset++ , 0x42 );
				}
				jisBuf.setUint8( offset++ , unicode );
			}
			// HALFWIDTH_KATAKANA
			else if( 0xFF61 <= unicode && unicode <= 0xFF9F ) {
				if( sequence !== 1 ) {
					sequence = 1;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x28 );
					jisBuf.setUint8( offset++ , 0x49 );
				}
				jisBuf.setUint8( offset++ , unicode - 0xFF40 );
			}
			else {
				var code = JISInverted[ unicode ];
				if( code ) {
					// KANJI
					if( sequence !== 2 ) {
						sequence = 2;
						jisBuf.setUint8( offset++ , 0x1B );
						jisBuf.setUint8( offset++ , 0x24 );
						jisBuf.setUint8( offset++ , 0x42 );
					}
					jisBuf.setUint8( offset++ , code >> 8 );
					jisBuf.setUint8( offset++ , code & 0xFF );
				}
				else {
					var ext = JISEXTInverted[ unicode ];
					if( ext ) {
						// EXTENSION
						if( sequence !== 3 ) {
							sequence = 3;
							jisBuf.setUint8( offset++ , 0x1B );
							jisBuf.setUint8( offset++ , 0x24 );
							jisBuf.setUint8( offset++ , 0x28 );
							jisBuf.setUint8( offset++ , 0x44 );
						}
						jisBuf.setUint8( offset++ , ext >> 8 );
						jisBuf.setUint8( offset++ , ext & 0xFF );
					}
					else {
						// UNKNOWN
						if( sequence !== 2 ) {
							sequence = 2;
							jisBuf.setUint8( offset++ , 0x1B );
							jisBuf.setUint8( offset++ , 0x24 );
							jisBuf.setUint8( offset++ , 0x42 );
						}
						jisBuf.setUint8( offset++ , unknownJis >> 8 );
						jisBuf.setUint8( offset++ , unknownJis & 0xFF );
					}
				}
			}
		}

		// Add ASCII ESC
		if( sequence !== 0 ) {
			sequence = 0;
			jisBuf.setUint8( offset++ , 0x1B );
			jisBuf.setUint8( offset++ , 0x28 );
			jisBuf.setUint8( offset++ , 0x42 );
		}
		return	jisBuf.slice( 0, offset );
	}
});

// UCS2 -> EUCJP
jconv.defineEncoding({
	name: 'UCS2toEUCJP',

	convert: function( buf ) {
		var unknownJis = JISInverted[ unknown ],
				len        = buf.length,
				eucBuf     = new DataView(new ArrayBuffer( len * 2 )),
				offset     = 0,
				unicode;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ ),
				byte2 = buf.getUint8( i++ );

			unicode = ( byte2 << 8 ) + byte1;

			// ASCII
			if( unicode < 0x80 ) {
				eucBuf.setUint8( offset++ , unicode );
			}
			// HALFWIDTH_KATAKANA
			else if( 0xFF61 <= unicode && unicode <= 0xFF9F ) {
				eucBuf.setUint8( offset++ , 0x8E );
				eucBuf.setUint8( offset++ , unicode - 0xFFC0 );
			}
			else {
				// KANJI
				var jis = JISInverted[ unicode ];
				if( jis ) {
					eucBuf.setUint8( offset++ , ( jis >> 8 ) - 0x80 );
					eucBuf.setUint8( offset++ , ( jis & 0xFF ) - 0x80 );
				}
				else {
					// EXTENSION
					var ext = JISEXTInverted[ unicode ];
					if( ext ) {
						eucBuf.setUint8( offset++ , 0x8F );
						eucBuf.setUint8( offset++ , ( ext >> 8 ) - 0x80 );
						eucBuf.setUint8( offset++ , ( ext & 0xFF ) - 0x80 );
					}
					// UNKNOWN
					else {
						eucBuf.setUint8( offset++ , ( unknownJis >> 8 ) - 0x80 );
						eucBuf.setUint8( offset++ , ( unknownJis & 0xFF ) - 0x80 );
					}
				}
			}
		}
		return eucBuf.slice( 0, offset );
	}
});

// UTF8 -> UCS2
jconv.defineEncoding({
	name: 'UTF8toUCS2',

	convert: function( buf ) {
		var len        = buf.length,
				unicodeBuf = new DataView(new ArrayBuffer( len * 2 )),
				offset     = 0,
				unicode;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			switch( byte1 >> 4 ) {
				case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
					unicode = byte1;
					break;
				case 12: case 13:
					unicode = (byte1 & 0x1F) <<  6 | buf.getUint8( i++ ) & 0x3F;
					break;
				case 14:
					unicode = (byte1 & 0x0F) << 12 | (buf.getUint8( i++ ) & 0x3F) <<  6 | buf.getUint8( i++ ) & 0x3F;
					break;
				default:
					unicode = (byte1 & 0x07) << 18 | (buf.getUint8( i++ ) & 0x3F) << 12 | (buf.getUint8( i++ ) & 0x3F) << 6 | buf.getUint8( i++ ) & 0x3F;
					break;
			}
			offset = setUnicodeBuffer( unicode, unicodeBuf, offset );
		}
		return unicodeBuf.slice( 0, offset );
	}
});

// UTF8 -> SJIS
jconv.defineEncoding({
	name: 'UTF8toSJIS',

	convert: function( buf ) {
		var unknownSjis = SJISInverted[ unknown ],
				len         = buf.length,
				sjisBuf     = new DataView(new ArrayBuffer( len * 2 )),
				offset      = 0,
				unicode;

		for( var i = 0; i <len; ) {
			var byte1 = buf.getUint8( i++ );

			switch( byte1 >> 4 ) {
				case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
					unicode = byte1;
					break;
				case 12: case 13:
					unicode = (byte1 & 0x1F) <<  6 | buf.getUint8( i++ ) & 0x3F;
					break;
				case 14:
					unicode = (byte1 & 0x0F) << 12 | (buf.getUint8( i++ ) & 0x3F) <<  6 | buf.getUint8( i++ ) & 0x3F;
					break;
				default:
					unicode = (byte1 & 0x07) << 18 | (buf.getUint8( i++ ) & 0x3F) << 12 | (buf.getUint8( i++ ) & 0x3F) << 6 | buf.getUint8( i++ ) & 0x3F;
					break;
			}

			// ASCII
			if( unicode < 0x80 ) {
				sjisBuf.setUint8( offset++ , unicode );
			}
			// HALFWIDTH_KATAKANA
			else if( 0xFF61 <= unicode && unicode <= 0xFF9F ) {
				sjisBuf.setUint8( offset++ , unicode - 0xFEC0 );
			}
			// KANJI
			else {
				var code = SJISInverted[ unicode ] || unknownSjis;
				sjisBuf.setUint8( offset++ , code >> 8 );
				sjisBuf.setUint8( offset++ , code & 0xFF );
			}
		}
		return sjisBuf.slice( 0, offset );
	}
});

// UTF8 -> JIS
jconv.defineEncoding({
	name: 'UTF8toJIS',

	convert: function( buf ) {
		var unknownJis = JISInverted[ unknown ],
        len        = buf.length,
				jisBuf     = new DataView(new ArrayBuffer( len * 3 + 4 )),
				offset     = 0,
				sequence   = 0,
				unicode;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			switch( byte1 >> 4 ) {
				case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
					unicode = byte1;
					break;
				case 12: case 13:
					unicode = (byte1 & 0x1F) <<  6 | buf.getUint8( i++ ) & 0x3F;
					break;
				case 14:
					unicode = (byte1 & 0x0F) << 12 | (buf.getUint8( i++ ) & 0x3F) <<  6 | buf.getUint8( i++ ) & 0x3F;
					break;
				default:
					unicode = (byte1 & 0x07) << 18 | (buf.getUint8( i++ ) & 0x3F) << 12 | (buf.getUint8( i++ ) & 0x3F) << 6 | buf.getUint8( i++ ) & 0x3F;
					break;
			}

			// ASCII
			if( unicode < 0x80 ) {
				if( sequence !== 0 ) {
					sequence = 0;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x28 );
					jisBuf.setUint8( offset++ , 0x42 );
				}
				jisBuf.setUint8( offset++ , unicode );
			}
			// HALFWIDTH_KATAKANA
			else if( 0xFF61 <= unicode && unicode <= 0xFF9F ) {
				if( sequence !== 1 ) {
					sequence = 1;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x28 );
					jisBuf.setUint8( offset++ , 0x49 );
				}
				jisBuf.setUint8( offset++ , unicode - 0xFF40 );
			}
			else {
				var code = JISInverted[ unicode ];
				if( code ) {
					// KANJI
					if( sequence !== 2 ) {
						sequence = 2;
						jisBuf.setUint8( offset++ , 0x1B );
						jisBuf.setUint8( offset++ , 0x24 );
						jisBuf.setUint8( offset++ , 0x42 );
					}
					jisBuf.setUint8( offset++ , code >> 8 );
					jisBuf.setUint8( offset++ , code & 0xFF );
				}
				else {
					var ext = JISEXTInverted[ unicode ];
					if( ext ) {
						// EXTENSION
						if( sequence !== 3 ) {
							sequence = 3;
							jisBuf.setUint8( offset++ , 0x1B );
							jisBuf.setUint8( offset++ , 0x24 );
							jisBuf.setUint8( offset++ , 0x28 );
							jisBuf.setUint8( offset++ , 0x44 );
						}
						jisBuf.setUint8( offset++ , ext >> 8 );
						jisBuf.setUint8( offset++ , ext & 0xFF );
					}
					else {
						// UNKNOWN
						if( sequence !== 2 ) {
							sequence = 2;
							jisBuf.setUint8( offset++ , 0x1B );
							jisBuf.setUint8( offset++ , 0x24 );
							jisBuf.setUint8( offset++ , 0x42 );
						}
						jisBuf.setUint8( offset++ , unknownJis >> 8 );
						jisBuf.setUint8( offset++ , unknownJis & 0xFF );
					}
				}
			}
		}

		// Add ASCII ESC
		if( sequence !== 0 ) {
			sequence = 0;
			jisBuf.setUint8( offset++ , 0x1B );
			jisBuf.setUint8( offset++ , 0x28 );
			jisBuf.setUint8( offset++ , 0x42 );
		}
		return jisBuf.slice( 0, offset );
	}
});

// UTF8 -> EUCJP
jconv.defineEncoding({
	name: 'UTF8toEUCJP',

	convert: function( buf ) {
		var unknownJis = JISInverted[ unknown ],
        len        = buf.length,
				eucBuf     = new DataView(new ArrayBuffer( len * 2 )),
				offset     = 0,
				unicode;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			switch( byte1 >> 4 ) {
				case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
					unicode = byte1;
					break;
				case 12: case 13:
					unicode = (byte1 & 0x1F) <<  6 | buf.getUint8( i++ ) & 0x3F;
					break;
				case 14:
					unicode = (byte1 & 0x0F) << 12 | (buf.getUint8( i++ ) & 0x3F) <<  6 | buf.getUint8( i++ ) & 0x3F;
					break;
				default:
					unicode = (byte1 & 0x07) << 18 | (buf.getUint8( i++ ) & 0x3F) << 12 | (buf.getUint8( i++ ) & 0x3F) << 6 | buf.getUint8( i++ ) & 0x3F;
					break;
			}

			// ASCII
			if( unicode < 0x80 ) {
				eucBuf.setUint8( offset++ , unicode );
			}
			// HALFWIDTH_KATAKANA
			else if( 0xFF61 <= unicode && unicode <= 0xFF9F ) {
				eucBuf.setUint8( offset++ , 0x8E );
				eucBuf.setUint8( offset++ , unicode - 0xFFC0 );
			}
			else {
				// KANJI
				var jis = JISInverted[ unicode ];
				if( jis ) {
					eucBuf.setUint8( offset++ , ( jis >> 8 ) - 0x80 );
					eucBuf.setUint8( offset++ , ( jis & 0xFF ) - 0x80 );
				}
				else {
					// EXTENSION
					var ext = JISEXTInverted[ unicode ];
					if( ext ) {
						eucBuf.setUint8( offset++ , 0x8F );
						eucBuf.setUint8( offset++ , ( ext >> 8 ) - 0x80 );
						eucBuf.setUint8( offset++ , ( ext & 0xFF ) - 0x80 );
					}
					// UNKNOWN
					else {
						eucBuf.setUint8( offset++ , ( unknownJis >> 8 ) - 0x80 );
						eucBuf.setUint8( offset++ , ( unknownJis & 0xFF ) - 0x80 );
					}
				}
			}
		}
		return eucBuf.slice( 0, offset );
	}
});

// SJIS -> UCS2
jconv.defineEncoding({
	name: 'SJIStoUCS2',

	convert: function( buf ) {
		var len        = buf.length,
				unicodeBuf = new DataView(new ArrayBuffer( len * 3 )),
				offset     = 0,
				unicode;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ASCII
			if( byte1 < 0x80 ) {
				unicode = byte1;
			}
			// HALFWIDTH_KATAKANA
			else if( 0xA0 <= byte1 && byte1 <= 0xDF ) {
				unicode = byte1 + 0xFEC0;
			}
			// KANJI
			else {
				var code = ( byte1 << 8 ) + buf.getUint8( i++ );
				unicode  = SJIS[ code ] || unknown;
			}
			offset = setUnicodeBuffer( unicode, unicodeBuf, offset );
		}
		return unicodeBuf.slice( 0, offset );
	}
});

// SJIS -> UTF8
jconv.defineEncoding({
	name: 'SJIStoUTF8',

	convert: function( buf ) {
		var len     = buf.length,
				utf8Buf = new DataView(new ArrayBuffer( len * 3 )),
				offset  = 0,
				unicode;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ASCII
			if( byte1 < 0x80 ) {
				unicode = byte1;
			}
			// HALFWIDTH_KATAKANA
			else if( 0xA0 <= byte1 && byte1 <= 0xDF ) {
				unicode = byte1 + 0xFEC0;
			}
			// KANJI
			else {
				var code = ( byte1 << 8 ) + buf.getUint8( i++ );
				unicode  = SJIS[ code ] || unknown;
			}
			offset = setUtf8Buffer( unicode, utf8Buf, offset );
		}
		return utf8Buf.slice( 0, offset );
	}
});

// SJIS -> JIS
jconv.defineEncoding({
	name: 'SJIStoJIS',

	convert: function( buf ) {
		var len      = buf.length,
				jisBuf   = new DataView(new ArrayBuffer( len * 3 + 4 )),
				offset   = 0,
				sequence = 0;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ASCII
			if( byte1 < 0x80 ) {
				if( sequence !== 0 ) {
					sequence = 0;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x28 );
					jisBuf.setUint8( offset++ , 0x42 );
				}
				jisBuf.setUint8( offset++ , byte1 );
			}
			// HALFWIDTH_KATAKANA
			else if( 0xA1 <= byte1 && byte1 <= 0xDF ) {
				if( sequence !== 1 ) {
					sequence = 1;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x28 );
					jisBuf.setUint8( offset++ , 0x49 );
				}
				jisBuf.setUint8( offset++ , byte1 - 0x80 );
			}
			// KANJI
			else if( byte1 <= 0xEE ) {
				if( sequence !== 2 ) {
					sequence = 2;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x24 );
					jisBuf.setUint8( offset++ , 0x42 );
				}
				var byte2 = buf.getUint8( i++ );
				byte1 <<= 1;
				if( byte2 < 0x9F ) {
					if( byte1 < 0x13F ) byte1 -= 0xE1;
					else byte1 -= 0x61;
					if( byte2 > 0x7E ) byte2 -= 0x20;
					else byte2 -= 0x1F;
				}
				else {
					if( byte1 < 0x13F ) byte1 -= 0xE0;
					else byte1 -= 0x60;
					byte2 -= 0x7E;
				}
				jisBuf.setUint8( offset++ , byte1 );
				jisBuf.setUint8( offset++ , byte2 );
			}
			// IBM EXTENSION -> the other
			else if( byte1 >= 0xFA ) {
				if( sequence !== 2 ) {
					sequence = 2;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x24 );
					jisBuf.setUint8( offset++ , 0x42 );
				}
				var sjis    = ( byte1 << 8 ) + buf.getUint8( i++ ),
					unicode = SJIS[ sjis ] || unknown,
					code    = JISInverted[ unicode ];

				jisBuf.setUint8( offset++ , code >> 8 );
				jisBuf.setUint8( offset++ , code & 0xFF );
			}
		}

		// Add ASCII ESC
		if( sequence !== 0 ) {
			sequence = 0;
			jisBuf.setUint8( offset++ , 0x1B );
			jisBuf.setUint8( offset++ , 0x28 );
			jisBuf.setUint8( offset++ , 0x42 );
		}
		return jisBuf.slice( 0, offset );
	}
});

// SJIS -> EUCJP
jconv.defineEncoding({
	name: 'SJIStoEUCJP',

	convert: function( buf ) {
		var len     = buf.length,
				eucBuf  = new DataView(new ArrayBuffer( len * 2 )),
				offset  = 0;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ASCII
			if( byte1 < 0x80 ) {
				eucBuf.setUint8( offset++ , byte1 );
			}
			// HALFWIDTH_KATAKANA
			else if( 0xA1 <= byte1 && byte1 <= 0xDF ) {
				eucBuf.setUint8( offset++ , 0x8E );
				eucBuf.setUint8( offset++ , byte1 );
			}
			// KANJI
			else if( byte1 <= 0xEE ) {
				var byte2 = buf.getUint8( i++ );
				byte1 <<= 1;
				if( byte2 < 0x9F ) {
					if( byte1 < 0x13F ) byte1 -= 0x61;
					else byte1 -= 0xE1;
					if( byte2 > 0x7E ) byte2 += 0x60;
					else byte2 += 0x61;
				}
				else {
					if( byte1 < 0x13F ) byte1 -= 0x60;
					else byte1 -= 0xE0;
					byte2 += 0x02;
				}
				eucBuf.setUint8( offset++ , byte1 );
				eucBuf.setUint8( offset++ , byte2 );
			}
			// IBM EXTENSION -> the other
			else if( byte1 >= 0xFA ) {
				var sjis    = ( byte1 << 8 ) + buf.getUint8( i++ ),
						unicode = SJIS[ sjis ] || unknown,
						jis     = JISInverted[ unicode ];

				eucBuf.setUint8( offset++ , ( jis >> 8 ) - 0x80 );
				eucBuf.setUint8( offset++ , ( jis & 0xFF ) - 0x80 );
			}
		}
		return eucBuf.slice( 0, offset );
	}
});

// JIS -> UCS2
jconv.defineEncoding({
	name: 'JIStoUCS2',

	convert: function( buf ) {
		var len        = buf.length,
				unicodeBuf = new DataView(new ArrayBuffer( len * 2 )),
				offset     = 0,
				sequence   = 0,
				unicode;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ESC Sequence
			if( byte1 === 0x1b ) {
				var byte2 = buf.getUint8( i++ ),
					byte3 = buf.getUint8( i++ );
				switch( byte2 ) {
					case 0x28:
						if( byte3 === 0x42 || buf === 0xA1 ) sequence = 0;
						else if( byte3 === 0x49 ) sequence = 1;
						break;
					case 0x26:
						sequence = 2;
						i += 3;
						break;
					case 0x24:
						if( byte3 === 0x40 || byte3 === 0x42 ) {
							sequence = 2;
						}
						else if( byte3 === 0x28 ) {
							sequence = 3;
							i++;
						}
						break;
				}
				continue;
			}

			switch( sequence ) {
				// ASCII
				case 0:
					unicode = byte1;
					break;
				// HALFWIDTH_KATAKANA
				case 1:
					unicode = byte1 + 0xFF40;
					break;
				// KANJI
				case 2:
					var code = ( byte1 << 8 ) + buf.getUint8( i++ );
					unicode  = JIS[ code ] || unknown;
					break;
				// EXTENSION
				case 3:
					var code = ( byte1 << 8 ) + buf.getUint8( i++ );
					unicode  = JISEXT[ code ] || unknown;
					break;
			}
			offset = setUnicodeBuffer( unicode, unicodeBuf, offset );
		}
		return unicodeBuf.slice( 0, offset );
	}
});

// JIS -> UTF8
jconv.defineEncoding({
	name: 'JIStoUTF8',

	convert: function( buf ) {
		var len      = buf.length,
				utf8Buf  = new DataView(new ArrayBuffer( len * 2 )),
				offset   = 0,
				sequence = 0,
				unicode;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ESC Sequence
			if( byte1 === 0x1b ) {
				var byte2 = buf.getUint8( i++ ),
					byte3 = buf.getUint8( i++ );
				switch( byte2 ) {
					case 0x28:
						if( byte3 === 0x42 || buf === 0xA1 ) sequence = 0;
						else if( byte3 === 0x49 ) sequence = 1;
						break;
					case 0x26:
						sequence = 2;
						i += 3;
						break;
					case 0x24:
						if( byte3 === 0x40 || byte3 === 0x42 ) {
							sequence = 2;
						}
						else if( byte3 === 0x28 ) {
							sequence = 3;
							i++;
						}
						break;
				}
				continue;
			}

			switch( sequence ) {
				// ASCII
				case 0:
					unicode = byte1;
					break;
				// HALFWIDTH_KATAKANA
				case 1:
					unicode = byte1 + 0xFF40;
					break;
				// KANJI
				case 2:
					var code = ( byte1 << 8 ) + buf.getUint8( i++ );
					unicode  = JIS[ code ] || unknown;
					break;
				// EXTENSION
				case 3:
					var code = ( byte1 << 8 ) + buf.getUint8( i++ );
					unicode  = JISEXT[ code ] || unknown;
					break;
			}
			offset = setUtf8Buffer( unicode, utf8Buf, offset );
		}
		return utf8Buf.slice( 0, offset );
	}
});

// JIS -> SJIS
jconv.defineEncoding({
	name: 'JIStoSJIS',

	convert: function( buf ) {
		var unknownSjis = SJISInverted[ unknown ],
        len         = buf.length,
				sjisBuf     = new DataView(new ArrayBuffer( len * 2 )),
				offset      = 0,
				sequence    = 0;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ESC Sequence
			if( byte1 === 0x1b ) {
				var byte2 = buf.getUint8( i++ ),
						byte3 = buf.getUint8( i++ );
				switch( byte2 ) {
					case 0x28:
						if( byte3 === 0x42 || buf === 0xA1 ) {
							sequence = 0;
						}
						else if( byte3 === 0x49 ) {
							sequence = 1;
						}
						break;
					case 0x26:
						sequence = 2;
						i += 3;
						break;
					case 0x24:
						if( byte3 === 0x40 || byte3 === 0x42 ) {
							sequence = 2;
						}
						else if( byte3 === 0x28 ) {
							sequence = 3;
							i++;
						}
						break;
				}
				continue;
			}

			switch( sequence ) {
				// ASCII
				case 0:
					sjisBuf.setUint8( offset++ , byte1 );
				break;
				// HALFWIDTH_KATAKANA
				case 1:
					sjisBuf.setUint8( offset++ , byte1 + 0x80 );
				break;
				// KANJI
				case 2:
					var byte2 = buf.getUint8( i++ );
					if( byte1 & 0x01 ) {
						byte1 >>= 1;
						if( byte1 < 0x2F ) byte1 += 0x71;
						else byte1 -= 0x4F;
						if( byte2 > 0x5F ) byte2 += 0x20;
						else byte2 += 0x1F;
					}
					else {
						byte1 >>= 1;
						if( byte1 <= 0x2F ) byte1 += 0x70;
						else byte1 -= 0x50;
						byte2 += 0x7E;
					}
					// NEC SELECT IBM EXTENSION -> IBM EXTENSION.
					var sjis = ( (byte1 & 0xFF) << 8 ) + byte2;
					if( 0xED40 <= sjis && sjis <= 0xEEFC ) {
						var unicode   = SJIS[ sjis ],
							  sjisFixed = SJISInverted[ unicode ] || unknownSjis;

						byte1 = sjisFixed >> 8;
						byte2 = sjisFixed & 0xFF;
					}
					sjisBuf.setUint8( offset++ , byte1 );
					sjisBuf.setUint8( offset++ , byte2 );
					break;
				// EXTENSION
				case 3:
					sjisBuf.setUint8( offset++ , unknownSjis >> 8 );
					sjisBuf.setUint8( offset++ , unknownSjis & 0xFF );
					i++;
				break;
			}
		}
		return sjisBuf.slice( 0, offset );
	}
});

// JIS -> EUCJP
jconv.defineEncoding({
	name: 'JIStoEUCJP',

	convert: function( buf ) {
		var len      = buf.length,
				eucBuf   = new DataView(new ArrayBuffer( len * 2 )),
				offset   = 0,
				sequence = 0;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ESC Sequence
			if( byte1 === 0x1b ) {
				var byte2 = buf.getUint8( i++ ),
						byte3 = buf.getUint8( i++ );
				switch( byte2 ) {
					case 0x28:
						if( byte3 === 0x42 || buf === 0xA1 ) sequence = 0;
						else if( byte3 === 0x49 ) sequence = 1;
						break;
					case 0x26:
						sequence = 2;
						i += 3;
					break;
					case 0x24:
						if( byte3 === 0x40 || byte3 === 0x42 ) {
							sequence = 2;
						}
						else if( byte3 === 0x28 ) {
							sequence = 3;
							i++;
						}
					break;
				}
				continue;
			}

			switch( sequence ) {
				// ASCII
				case 0:
					eucBuf.setUint8( offset++ , byte1 );
					break;
				// HALFWIDTH_KATAKANA
				case 1:
					eucBuf.setUint8( offset++ , 0x8E );
					eucBuf.setUint8( offset++ , byte1 + 0x80 );
					break;
				// KANJI
				case 2:
					eucBuf.setUint8( offset++ , byte1 + 0x80 );
					eucBuf.setUint8( offset++ , buf.getUint8( i++ ) + 0x80 );
					break;
				// EXTENSION
				case 3:
					eucBuf.setUint8( offset++ , 0x8F );
					eucBuf.setUint8( offset++ , byte1 + 0x80 );
					eucBuf.setUint8( offset++ , buf.getUint8( i++ ) + 0x80 );
					break;
			}
		}
		return eucBuf.slice( 0, offset );
	}
});

// EUCJP -> UCS2
jconv.defineEncoding({
	name: 'EUCJPtoUCS2',

	convert: function( buf ) {
		var len        = buf.length,
				unicodeBuf = new DataView(new ArrayBuffer( len * 2 )),
				offset     = 0,
				unicode;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ASCII
			if( byte1 < 0x80 ) {
				unicode = byte1;
			}
			// HALFWIDTH_KATAKANA
			else if( byte1 === 0x8E ) {
				unicode = buf.getUint8( i++ ) + 0xFEC0;
			}
			// EXTENSION
			else if( byte1 === 0x8F ) {
				var jisbyte2 = buf.getUint8( i++ ) - 0x80,
					jisbyte3 = buf.getUint8( i++ ) - 0x80,
					jis = ( jisbyte2 << 8 ) + jisbyte3;
				unicode = JISEXT[ jis ] || unknown;
			}
			// KANJI
			else {
				var jisbyte1 = byte1 - 0x80,
					jisbyte2 = buf.getUint8( i++ ) - 0x80,
					jis = ( jisbyte1 << 8 ) + jisbyte2;
				unicode = JIS[ jis ] || unknown;
			}
			offset = setUnicodeBuffer( unicode, unicodeBuf, offset );
		}
		return unicodeBuf.slice( 0, offset );
	}
});

// EUCJP -> UTF8
jconv.defineEncoding({
	name: 'EUCJPtoUTF8',

	convert: function( buf ) {
		var len     = buf.length,
				utf8Buf = new DataView(new ArrayBuffer( len * 2 )),
				offset  = 0,
				unicode;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ASCII
			if( byte1 < 0x80 ) {
				unicode = byte1;
			}
			// HALFWIDTH_KATAKANA
			else if( byte1 === 0x8E ) {
				unicode = buf.getUint8( i++ ) + 0xFEC0;
			}
			// EXTENSION
			else if( byte1 === 0x8F ) {
				var jisbyte2 = buf.getUint8( i++ ) - 0x80,
					jisbyte3 = buf.getUint8( i++ ) - 0x80,
					jis = ( jisbyte2 << 8 ) + jisbyte3;
				unicode = JISEXT[ jis ] || unknown;
			}
			// KANJI
			else {
				var jisbyte1 = byte1 - 0x80,
					jisbyte2 = buf.getUint8( i++ ) - 0x80,
					jis = ( jisbyte1 << 8 ) + jisbyte2;
				unicode = JIS[ jis ] || unknown;
			}
			offset = setUtf8Buffer( unicode, utf8Buf, offset );
		}
		return utf8Buf.slice( 0, offset );
	}
});

// EUCJP -> SJIS
jconv.defineEncoding({
	name: 'EUCJPtoSJIS',

	convert: function( buf ) {
		var unknownSjis = SJISInverted[ unknown ],
        len         = buf.length,
				sjisBuf     = new DataView(new ArrayBuffer( len * 2 )),
				offset      = 0;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ASCII
			if( byte1 < 0x80 ) {
				sjisBuf.setUint8( offset++ , byte1 );
			}
			// HALFWIDTH_KATAKANA
			else if( byte1 === 0x8E ) {
				sjisBuf.setUint8( offset++ , buf.getUint8( i++ ) );
			}
			// EXTENSION
			else if( byte1 === 0x8F ) {
				sjisBuf.setUint8( offset++ , unknownSjis >> 8 );
				sjisBuf.setUint8( offset++ , unknownSjis & 0xFF );
				i += 2;
			}
			// KANJI
			else {
				var byte2 = buf.getUint8( i++ );
				if( byte1 & 0x01 ) {
					byte1 >>= 1;
					if( byte1 < 0x6F ) byte1 += 0x31;
					else byte1 += 0x71;
					if( byte2 > 0xDF ) byte2 -= 0x60;
					else byte2 -= 0x61;
				}
				else {
					byte1 >>= 1;
					if( byte1 <= 0x6F ) byte1 += 0x30;
					else byte1 += 0x70;
					byte2 -= 0x02;
				}
				// NEC SELECT IBM EXTENSION -> IBM EXTENSION.
				var sjis = ( (byte1 & 0xFF) << 8 ) + byte2;
				if( 0xED40 <= sjis && sjis <= 0xEEFC ) {
					var unicode   = SJIS[ sjis ],
							sjisFixed = SJISInverted[ unicode ] || unknownSjis;

					byte1 = sjisFixed >> 8;
					byte2 = sjisFixed & 0xFF;
				}
				sjisBuf.setUint8( offset++ , byte1 );
				sjisBuf.setUint8( offset++ , byte2 );
			}
		}
		return sjisBuf.slice( 0, offset );
	}
});

// EUCJP -> JIS
jconv.defineEncoding({
	name: 'EUCJPtoJIS',

	convert: function( buf ) {
		var len      = buf.length,
				jisBuf   = new DataView(new ArrayBuffer( len * 3 + 4 )),
				offset   = 0,
				sequence = 0;

		for( var i = 0; i < len; ) {
			var byte1 = buf.getUint8( i++ );

			// ASCII
			if( byte1 < 0x80 ) {
				if( sequence !== 0 ) {
					sequence = 0;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x28 );
					jisBuf.setUint8( offset++ , 0x42 );
				}
				jisBuf.setUint8( offset++ , byte1 );
			}
			// HALFWIDTH_KATAKANA
			else if( byte1 === 0x8E ) {
				if( sequence !== 1 ) {
					sequence = 1;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x28 );
					jisBuf.setUint8( offset++ , 0x49 );
				}
				jisBuf.setUint8( offset++ , buf.getUint8( i++ ) - 0x80 );
			}
			// EXTENSION
			else if( byte1 === 0x8F ) {
				if( sequence !== 3 ) {
					sequence = 3;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x24 );
					jisBuf.setUint8( offset++ , 0x28 );
					jisBuf.setUint8( offset++ , 0x44 );
				}
				jisBuf.setUint8( offset++ , buf.getUint8( i++ ) - 0x80 );
				jisBuf.setUint8( offset++ , buf.getUint8( i++ ) - 0x80 );
			}
			// KANJI
			else {
				if( sequence !== 2 ) {
					sequence = 2;
					jisBuf.setUint8( offset++ , 0x1B );
					jisBuf.setUint8( offset++ , 0x24 );
					jisBuf.setUint8( offset++ , 0x42 );
				}
				jisBuf.setUint8( offset++ , byte1 - 0x80 );
				jisBuf.setUint8( offset++ , buf.getUint8( i++ ) - 0x80 );
			}
		}

		// Add ASCII ESC
		if( sequence !== 0 ) {
			sequence = 0;
			jisBuf.setUint8( offset++ , 0x1B );
			jisBuf.setUint8( offset++ , 0x28 );
			jisBuf.setUint8( offset++ , 0x42 );
		}
		return jisBuf.slice( 0, offset );
	}
});
