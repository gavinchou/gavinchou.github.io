---
layout: post
title: "Brief Thinking of RSA"
date: 2018-08-19 20:43:54 +0800
comments: true
categories: experience summary
tags: RSA crypto https ssh
---

### public key and private key
1. get 2 (big) primes, `p` and `q`
2. find `n` which is the key divider, where `n = p * q`
3. `phi(n) = (p - 1) * (q - 1)`, in which `phi(n)` is called Euler function
4. public key `e`(short for its purpose encryption), which requires that:
	* `1 < e < phi(n)`
	* `e` and `phi(n)` are coprime (no common factor)
5. private key `d`(short for its purpose decryption), which requires that:
	* `(e * d) % phi(n) == 1`

And all we need for encryption and decryption is `n`, `e` and `d`.
<!-- more -->
### encrypt and decrypt
Cipher text `c`, plain text `m`
* encrypt: `(m ^ e) % n = c`
* decrypt: `(c ^ d) % n = m`, check reference for more detail

We have 2 ways to build duplex-communication:
1. A, the one keeps B's public key, sends its public key to B, and B encrypt
	 using A's public key. Secure but inefficient.
2. A, the one keeps public key, sends a symmetric key for further
	 decryption/encryption, fast and efficient.

### ssh and RSA
One way to establish ssh connection is using RSA, it needs a public key file and
a private key file, they are called `id_rsa_pub` and `id_rsa` respectively by
default.

* private key (file) stores: `n`, `phi(n)`, `e`(?) and `d`
* public key (file) exposes: `n`, `e`

We can deduce the public key file with private key file, that's why we can login
with private key file:
```
ssh ${user}@${remote_server} -i ${local_path_to_private_rsa_of_remote_server}
```

### man in the middle attack
RSA can not prevent man-in-middle attack.

Take ssh for example, A want to logging onto B

The **normal** brief procedure may be:
```
       A                                    B
       | 1. A asks B for public key         |
       | ---------------------------------> |
       |                                    |
       | 2. B gives A public key            |
       | <--------------------------------- |
       |                                    |
       | 3. A initiates ssh session with B's|
       |    public using RSA                |
       | ---------------------------------> |
       |                                    |
       | 4. A and B communicate with        |
       |    symmetric key (AES/DES)         |
       | <--------------------------------> |
       |                                    |
```

The **man-in-the-middle** attack may be:
```
   (X hack the router between A and B, it can modify all network packets)

   A                           X(man-in-the-middle)                          B
   |                                    |                                    |
   | 1. A asks B for public key         |                                    |
   | ---------------------------------> |                                    |
   |                                    | 2. X asks B for public key         |
   |                                    | ---------------------------------> |
   |                                    |                                    |
   |                                    | 3. B gives B's public key to X     |
   |                                    | <--------------------------------- |
   | 4. X gives X's public key to A     |                                    |
   | <--------------------------------- |                                    |
   |                                    |                                    |
   | 5. A initiates ssh session with    |                                    |
   |    X's public using RSA            |                                    |
   | ---------------------------------> |                                    |
   |                                    |                                    |
   |                                    | 6. X initiates ssh session with    |
   |                                    |    B's public using RSA            |
   |                                    | ---------------------------------> |
   |                                    |                                    |
   |                                    | 7. X and B communicate with        |
   |                                    |    symmetric key (AES/DES)         |
   |                                    | <--------------------------------> |
   |                                    |                                    |
   | 8. A and X communicate with        |                                    |
   |    symmetric key (AES/DES)         |                                    |
   | <--------------------------------> |                                    |
   |                                    |                                    |
```

A thinks the communication target is B, however, it's X instead, which may
change the content A try to send to B, and X can pretend it's B send something
to A.

### HTTPS, CA, and RSA
Certificates can resolve the problem of man-in-the-middle attack.
Refer to `X.509` for more info.

### ref
[math fundamentals of RSA](http://www.ruanyifeng.com/blog/2013/06/rsa_algorithm_part_one.html)  
[decryption proof of RSA](http://www.ruanyifeng.com/blog/2013/07/rsa_algorithm_part_two.html)  
[ssh MAN-IN-THE-MIDDLE ATTACK](https://www.ssh.com/attack/man-in-the-middle)  
