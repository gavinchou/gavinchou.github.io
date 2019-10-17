---
layout: post
title:  "unicode"
date: 2017-10-30 14:05:42 +0800
categories: experience summary
tags: unicode utf8 utf16 replacement char UTF-8 UTF-16 UTF-32
---

## unicode, utf8, utf16, replacement char, UTF-8, UTF-16, UTF-32
created: 2017-10-30-Mon 14:05:42
update: 2019-10-17-Thu 22:03:57

### Unicode, UCS-2, UCS-4,

UCS is short for universal character set, and unicode is an implementation for
that.

UCS-2 simply uses two bytes (16 bits) for each character but can only encode the
first 65,536 code points, the so-called Basic Multilingual Plane. With 1,114,112
code points on 17 planes being possible, and with **over 120,000 code points
defined so far**, many Unicode characters are beyond the reach of UCS-2.
Therefore, **UCS-2 is obsolete**, though still widely used in software. UTF-16
extends UCS-2, by using the same 16-bit encoding as UCS-2 for the Basic
Multilingual Plane, and a 4-byte encoding for the other planes. As long as it
contains **no code points in the reserved range U+0D800-U+0DFFF**, a UCS-2 text
is a valid UTF-16 text.

<!-- more -->
UCS-4 (also referred to as UTF-32) uses four bytes for each character. Like
UCS-2, the number of bytes per character is fixed, facilitating character
indexing; but unlike UCS-2, UCS-4 is able to encode all Unicode code points.
However, because each character uses four bytes, UCS-4 takes significantly more
space than other encodings, and is not widely used.

### Unicode planes, 65535 chars per plane, 17 planes total

The first plane, plane 0, the Basic Multilingual Plane (BMP) contains characters
for almost all modern languages, and a large number of symbols.
**Almost all Chinese, Japanese and Korean characters are in plane 0**

Plane 1, the Supplementary Multilingual Plane (SMP), contains historic scripts
(except CJK ideographic), and symbols and notation used within certain fields.

Plane 2, the Supplementary Ideographic Plane (SIP), is used for CJK Ideographs,
mostly CJK Unified Ideographs, that were not included in earlier character
encoding standards.

Planes 3 to 13 (planes 3 to D in hexadecimal): No characters have yet been
assigned to Planes 3 through 13.

Plane 14 (E in hexadecimal), the Supplementary Special-purpose Plane (SSP),
currently contains non-graphical characters.

The two planes 15 and 16 (planes F and 10 in hexadecimal), are designated as
"private use planes".

### UTF-8

UTF-8 is defined by the Unicode Standard [UNICODE].  Descriptions and
formulae can also be found in Annex D of ISO/IEC 10646-1 [ISO.10646]

In UTF-8, characters from the U+0000..U+10FFFF range (the UTF-16
accessible range) are encoded using sequences of 1 to 4 octets.  The
only octet of a "sequence" of one has the higher-order bit set to 0,
the remaining 7 bits being used to encode the character number.  In a
sequence of n octets, n>1, the initial octet has the n higher-order
bits set to 1, followed by a bit set to 0.  The remaining bit(s) of
that octet contain bits from the number of the character to be
encoded.  The following octet(s) all have the higher-order bit set to
1 and the following bit set to 0, leaving 6 bits in each to contain
bits from the character to be encoded.

The table below summarizes the format of these different octet types.
The letter x indicates bits available for encoding bits of the
character number.

```
Char. number range  |        UTF-8 octet sequence
   (hexadecimal)    |              (binary)
--------------------+---------------------------------------------
0000 0000-0000 007F | 0xxxxxxx
0000 0080-0000 07FF | 110xxxxx 10xxxxxx
0000 0800-0000 FFFF | 1110xxxx 10xxxxxx 10xxxxxx
0001 0000-0010 FFFF | 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
```

#### Encoding a character to UTF-8

1.    Determine the number of octets required from the character number
      and the first column of the table above.  It is important to note
      that the rows of the table are mutually exclusive, i.e., there is
      only one valid way to encode a given character.

2. Prepare the high-order bits of the octets as per the second
       column of the table.

   3.  Fill in the bits marked x from the bits of the character number,
       expressed in binary.  Start by putting the lowest-order bit of
       the character number in the lowest-order position of the last
       octet of the sequence, then put the next higher-order bit of the
       character number in the next higher-order position of that octet,
       etc.  When the x bits of the last octet are filled in, move on to
       the next to last octet, then to the preceding one, etc. until all
       x bits are filled in.


#### Decoding a UTF-8 character

1.    Initialize a binary number with all bits set to 0.  Up to 21 bits
      may be needed.

2. Determine which bits encode the character number from the number
       of octets in the sequence and the second column of the table
       above (the bits marked x).

   3.  Distribute the bits from the sequence to the binary number, first
       the lower-order bits from the last octet of the sequence and
       proceeding to the left until no x bits are left.  The binary
       number is now equal to the character number.


### UTF-16

UTF-16 is compatible with unicode plane 0, if unicode point larger than `0xFFFF`,
encode the unicode as 4 bytes using `[0xD800, 0xDBFF]` as first surrogate pair,
and `[0xDC00, 0xDFFF]` as second surrogate pair, UTF-16 can encode up to 20
bits (less than UTF-8 21 bits).

#### Encoding UTF-16

Encoding of a single character from an ISO 10646 character value to
UTF-16 proceeds as follows. Let U be the character number, no greater
than 0x10FFFF (unicode has 17 planes for now, and a lot of code points
are not allocated yet).

1. If U < 0x10000, encode U as a 16-bit unsigned integer and
   terminate.

2. Let U' = U - 0x10000. Because U is less than or equal to 0x10FFFF,
   U' must be less than or equal to 0xFFFFF. That is, U' can be
    represented in 20 bits.

3. Initialize two 16-bit unsigned integers, W1 and W2, to 0xD800 and
   0xDC00, respectively. These integers each have 10 bits free to
    encode the character value, for a total of 20 bits.

4. Assign the 10 high-order bits of the 20-bit U' to the 10 low-order
   bits of W1 and the 10 low-order bits of U' to the 10 low-order
    bits of W2. Terminate.

Graphically, steps 2 through 4 look like:

```
U' = yyyyyyyyyyxxxxxxxxxx
// [D800, DBFF]
W1 = 110110yyyyyyyyyy
// [DC00, DFFF]
W2 = 110111xxxxxxxxxx
```

#### Decoding UTF-16

Decoding of a single character from UTF-16 to an ISO 10646 character
value proceeds as follows. Let W1 be the next 16-bit integer in the
sequence of integers representing the text. Let W2 be the (eventual)
next integer following W1.

1. If W1 < 0xD800 or W1 > 0xDFFF, the character value U is the value
   of W1. Terminate.

2. Determine if W1 is between 0xD800 and 0xDBFF. If not, the sequence
   is in error and no valid character can be obtained using W1.
    Terminate.

3. If there is no W2 (that is, the sequence ends with W1), or if W2
   is not between 0xDC00 and 0xDFFF, the sequence is in error.
    Terminate.

4. Construct a 20-bit unsigned integer U', taking the 10 low-order
   bits of W1 as its 10 high-order bits and the 10 low-order bits of
    W2 as its 10 low-order bits.


5. Add 0x10000 to U' to obtain the character value U. Terminate.

   Note that steps 2 and 3 indicate errors. Error recovery is not
    specified by this document. When terminating with an error in steps 2
    and 3, it may be wise to set U to the value of W1 to help the caller
    diagnose the error and not lose information. Also note that a string
    decoding algorithm, as opposed to the single-character decoding
    described above, need not terminate upon detection of an error, if
    proper error reporting and/or recovery is provided.


### UTF-32
UTF-32 (also known as UCS-4) simply encodes each code point as a 32-bit integer.

### Unicode, UTF-8, UTF-16 in Java

Unicode currently has 17 planes, plane 0 to plane 16, the plane 0 is the BMP
(basic multilingual plane), common chars range in `[U+0000, U+FFF0)`.

In plane 0, range `[U+FFF0, U+FFFF)` is for special chars.

```
Specials
Range	U+FFF0..U+FFFF
(16 code points)
Plane	BMP
Scripts	Common
Assigned	5 code points
Unused	9 reserved code points
2 non-characters

U+FFF9 INTERLINEAR ANNOTATION ANCHOR, marks start of annotated text
U+FFFA INTERLINEAR ANNOTATION SEPARATOR, marks start of annotating character(s)
U+FFFB INTERLINEAR ANNOTATION TERMINATOR, marks end of annotation block
U+FFFC ￼ OBJECT REPLACEMENT CHARACTER, placeholder in the text for another unspecified object, for example in a compound document.
U+FFFD � REPLACEMENT CHARACTER used to replace an unknown, unrecognized or unrepresentable character
U+FFFE <noncharacter-FFFE> not a character.
U+FFFF <noncharacter-FFFF> not a character.
```

Java String will decode unrecognized encoded utf8 bytes array with 4 `U+FFFD`
unicode chars.

```
// encoded bytes, max utf8 bytes
bytes[0] = 0xF7;
bytes[1] = 0xBF;
bytes[2] = 0xBF;
bytes[3] = 0xBF;

str = new String(bytes, "UTF8");
System.out.println(str); // will get ����
printHex(str.getBytes("utf8")); // will get EF BF BD EF BF BD EF BF BD EF BF BD

// the following decode will not fail even if the raw bytes are all 0xff
// all treat as unknown char, an replace with replacement char
bytes[0] = 0xFF;
bytes[1] = 0xFF;
bytes[2] = 0xFF;
bytes[3] = 0xFF;
str = new String(bytes, "UTF8"); // won't fail
System.out.println(str); // will get ����
printHex(str.getBytes("utf8")); // will get EF BF BD EF BF BD EF BF BD EF BF BD
```

Hence, in other word, in Java, there is no other utf8 string will be greater
than replacement char `U+FFFD`

String of Java is UTF-16 encoded inside JVM, that why Java recognizes UTF-16
format only when we define String with escaping hex code point.

```
final String s = "\uXXXX\uYYYY"; // x is high surrogate, y is low surrogate
```

### reference
[unicode](https://en.wikipedia.org/wiki/Unicode)  
[unicode specials](https://en.wikipedia.org/wiki/Specials_(Unicode_block))  
[utf-8 rfc3629](https://tools.ietf.org/html/rfc3629)  
[utf-8 wikipedia](https://en.wikipedia.org/wiki/UTF-8)  
[unicode plane](https://en.wikipedia.org/wiki/Plane_(Unicode))  
[BMP (basic multilingual plane)](https://en.wikipedia.org/wiki/Plane_(Unicode)#Basic_Multilingual_Plane)  
[where is my character](http://www.unicode.org/standard/where/)  
[find char by hex code point](http://www.unicode.org/charts/index.html)  
[unicode converter](https://www.branah.com/unicode-converter)  
[utf-16 rfc2781](https://tools.ietf.org/html/rfc2781)  
[utf-32 rfc5198](https://tools.ietf.org/html/rfc5198)  
