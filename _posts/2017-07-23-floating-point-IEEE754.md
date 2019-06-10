---
layout: post
title: "Floating point, IEEE754"
date: 2017-07-23 22:34:00 +0800
comments: true
categories: experience summary
tags: encoding float
---
#  IEEE754, floating point, conversion (representation)

## binary representation
<!-- more -->
```
for single precition, float 32bits

MSB                                LSB
0 0000000|0 0000000|00000000|00000000
^ ^       ^ ^                       ^
| \-------/ \-----------------------/
|     |                |
|     |             fraction(mantissa), 23bits
|    exponent, 8bits, bias = -127
sign, 1 bit

bias = -127
sign 1 bit
exp 8 bits
mantissa 23 bits

for double precition, double 64bits

MSB                                LSB
0 0000000|0000 0000|00000000|00000000|00000000|00000000|00000000|00000000
^ ^          ^ ^                                                        ^
| \----------/ \--------------------------------------------------------/
|     |                |
|     |             fraction(mantissa), 52bits
|    exponent, 11bits, bias = -1023
sign, 1 bit

bias = -1023
sign 1 bit
exp 11 bits
mantissa 52 bits

```

## IEEE754 binary to decimal

```
given IEEE754 binary form, 32bit single precision floating point

32 bits total
sign 1 bit
exp 8 bits
mantissa 23 bits

    MSB                                 LSB
     0 1000001|0 0100001|11101011|10000101
     ^ ^-------^ ^-----------------------^
 sign|     |exp             |mantissa
     |     |                |
     |      \---------------+--------------------\
     |                      |                    |
    /               /-------/                    |
   |               |                             |
   v        v---------------------v           v------v
(-1)^s * (1.01000011110101110000101)_2  *  2^(10000010 + bias)_2

 = (-1)^s(1 + sigma(frac(j) * 2 ^ (-j))) * (2 ^ (sigma(exp(i) * 2 ^ i) + bias))
   where i ranges from 0 to 7, j ranges from 1 to 23
   exp(i) = 1, if the ith bit of exponent is 1, othewise exp(i) = 0
   frac(j) = 1, if the jth bit of fraction is 1, othewise frac(j) = 0
 = (-1)^0 * (1 + 2^-2 + 2^-7 + ... + 2^-21 + 2^-23)_10 * 2 ^(2^8 + 2^2 - 127)_10
 = 1 * 1.2649999856948853_10 * 2^3
~= 10.12

(0 1000001|0 0100001|11101011|10000101)_2 = (10.12)_10


for double precision, 64 bit total

sign 1 bit
exp 11 bits
mantissa 52 bits

```

## decimal to IEEE754 binary
1. convert integer part to binary
2. convert fraction part to binary
3. convert to scientific representation, normalize
4. represent in IEEE754 format

```
10.12
 ^  ^
 |  \-------------------------      /------repeat-------\
 |                            \     v                   v
 \-------------------- 1010 .  \--- 000111101011100001010 ...
                       ^--^         ^------------------ ... ^
read remainder bottom up|               |
                        |               |
10 = 5 * 2 + 0 ^        |              /
5  = 2 * 2 + 1 |        |             /
2  = 1 * 2 + 0 |        |            /
1  = 0 * 2 + 1 | <-----/            /
                                   /
             /--------------------/ read integer part top down
            /
0.12 * 2 =  | 0 .24 <-\
0.24 * 2 =  | 0 .48   |
0.48 * 2 =  | 0 .96   |
0.96 * 2 =  | 1 .92   |
0.92 * 2 =  | 1 .84   |
0.84 * 2 =  | 1 .68   |
0.68 * 2 =  | 1 .36   |
0.36 * 2 =  | 0 .72   |
0.72 * 2 =  | 1 .44   |
0.44 * 2 =  | 0 .88   |
0.88 * 2 =  | 1 .76   |
0.76 * 2 =  | 1 .52   |-- repeat cycle, 000111101011100001010
0.52 * 2 =  | 1 .4    |
0.4  * 2 =  | 0 .8    |
0.8  * 2 =  | 0 .16   |
0.16 * 2 =  | 0 .32   |
0.32 * 2 =  | 0 .64   |
0.64 * 2 =  | 1 .28   |
0.28 * 2 =  | 0 .56   |
0.56 * 2 =  | 1 .12   |
0.12 * 2 =  | 0 .24 <-/
0.24 * 2 =  | 0 .48
0.48 * 2 =  | 0 .96
            .
            .
            .
0.68 * 2 =  | 1 .36
0.36 * 2 =  v 0 .72

 # python code for the above calculation simulation
if __name__ == '__main__':
    b = 12
    for i in range(1, 100):
        a = b * (b - 100) if b >= 100 else b * 2
        print("0.%-2d * 2 =    %d .%d" \
                % (b, (1 if a >= 100 else 0), (a - 100 if a >= 100 else a)))
        b = a - 100 if a >= 100 else a

hence,
                   v-------repeat------v
(10.12)_10 = (1010.000111101011100001010...)_2
             nomalize
                   v-------repeat------v
           = (1.010000111101011100001010... * 2^3)_2

format with IEEE754 spec single precision

           v-------repeat------v
     (1.010000111101011100001010... * 2^3)_2
        ^---------------------^        ^
                   |                   |
           /-------|------------------/
          |        \
          |         \-------\
    MSB   |                 |           LSB
       v-------v v-----------------------v
     0 0000000|0 0000000|00000000|00000000

 3 = exp - 127
   => exp = (130)_10
   = (10000010)_2
      ^------^
          |
          |         
       v-------v v-----------------------v
     0 1000001|0 0100001|11101011|10000101|0...
                    ^--------repeat------^

the same procedure format with IEEE754 spec double precision

           v-------repeat------v
     (1.010000111101011100001010... * 2^3)_2
        ^----------------------^       ^
                   |                   |
           /-------|------------------/
          |        \
          |         \-------\
    MSB   |                 |                                               LSB
       v----------v v--------------------------------------------------------v
     0 0000000|0000 0000|00000000|00000000|00000000|00000000|00000000|00000000

3 = exp - 1023, bias for double precision is -1023
  => exp = (1026)_10
  = (10000000010)_2
     ^---------^
           |
       v----------v v-------------------------------------------------------v
     0 1000000|0010 0100|00111101|01110000|10100011|11010111|00001010|00111101...
                       ^-------repeat-------^

```

## floating point arithmetic

TBD

## ref

<https://www.youtube.com/watch?v=tx-M_rqhuUA>  
<https://www.h-schmidt.net/FloatConverter/IEEE754.html>  
