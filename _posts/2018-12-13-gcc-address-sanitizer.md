---
layout: post
title:  "gcc address sanitizer"
date: 2018-12-13 21:38:55 +0800
categories: experience summary syntax
tags: c++ gcc memory-leak address-sanitizer
---

## c++, gcc, memory leak, sanitize, address sanitizer, leak sanitizer
time: 2018-12-13-Thu 21:38:55

`AddressSanitizer` (detects addressability issues, including leaks) and
`LeakSanitizer` (detects memory leaks)

`AddressSanitizer` (or ASan) is an open source programming tool by Google that
detects memory corruption bugs such as buffer overflows or accesses to a
dangling pointer (use-after-free). `AddressSanitizer` is based on compiler
instrumentation and directly-mapped shadow memory. `AddressSanitizer` is
currently implemented in Clang (starting from version 3.1) , GCC (starting from
version 4.8) and Xcode (starting from version 7.0) . On average, the
instrumentation increases processing time by about 73% and memory usage by 340%.

For gcc or clang, the newer version the better, build with the following options
to enable address/leak sanitizer.

```text
// linux build, it does not work on mac osx
-ggdb -fsanitize=address -fno-omit-frame-pointer -static-libstdc++ -static-libasan -lrt
// or
-ggdb -fsanitize=leak -fno-omit-frame-pointer -static-libstdc++ -static-liblsan -lrt

// mac osx build option
-ggdb -fsanitize=address -fno-omit-frame-pointer -static-libstdc++ -static-libgcc memory_leak.cpp
// or
-ggdb -fsanitize=leak -fno-omit-frame-pointer -static-libstdc++ -static-libgcc memory_leak.cpp
```
<!-- more -->
options explanation:  
* `-ggdb` and `-fno-omit-frame-pointer`, enable the call stack and line number
	for better report format to locate bug in user code
* `-fsanitize=${type}`, sanitizer type:
	* `address`, address level detection, heap and stack
	* `leak`, heap leak and heap overflow detection, no stack
* `-lrt`, needed by linux shared memory operation: `shm_open` and `shm_unlink`
* `-static-libasan`/`-static-liblsan`, choose corresponding to option
	`-fsanitize`, `asan` for address, `lsan` for leak
* `-static-libstdc++` and `-static-libgcc`, as the options' literal meaning

**Note: do not use any memory manager, say tcmalloc/jemalloc, when you try to
use the sanitizer of gcc**

### let's play

memory_leak.cpp

```c++
#include <iostream>
#include <unordered_map>
#include <string>
#include <functional>
#include <thread>
#include <sanitizer/lsan_interface.h>

// linux build command
// g++ -ggdb -fsanitize=address -fno-omit-frame-pointer -static-libstdc++ -static-libgcc -static-libasan -lrt memory_leak.cpp
// g++ -ggdb -fsanitize=leak -fno-omit-frame-pointer -static-libstdc++ -static-libgcc -static-liblsan -lrt memory_leak.cpp
//
// mac osx build command
// g++ -ggdb -fsanitize=address -fno-omit-frame-pointer -static-libstdc++ -static-libgcc memory_leak.cpp
// g++ -ggdb -fsanitize=leak -fno-omit-frame-pointer -static-libstdc++ -static-libgcc memory_leak.cpp

int heap_leak() {
  int* a = new int[10086];
  a[0] = 10086;
  std::cout << __PRETTY_FUNCTION__ << a[0] << std::endl;
  return 0;
}

int heap_use_after_free() {
  int* a = new int[10010];
  a[0] = 10010;
  delete[] a;
  std::cout << __PRETTY_FUNCTION__ << a[0] << std::endl;
  return 0;
}

int stack_buffer_overflow() {
  int a[10];
  std::cout << __PRETTY_FUNCTION__ << a[0] << std::endl;
  return a[10];
}

int heap_buffer_overflow() {
  int* a = new int[10010];
  a[10009] = 10010;
  std::cout << __PRETTY_FUNCTION__ << a[0] << std::endl;
  return a[10010];
}

int g_a[100];
int global_buffer_overflow() {
  std::cout << __PRETTY_FUNCTION__ << g_a[0] << std::endl;
  return g_a[100];
}

#include <vector>
std::vector<int*> g_vec;
int container_deferred() {
  for (int i = 0; i < 1008601; ++i) {
    g_vec.emplace_back(new int(i));
  }
	// global memory leak does not count until the orignal "container" of address
  // actually is replaced
  g_vec.clear();
  g_vec.emplace_back(nullptr); // 4 bytes leak
  g_vec.emplace_back(nullptr); // 8 bytes leak
  return 0;
}

std::unordered_map<std::string, std::function<int()>> g_func = {
  {"global_buffer_overflow", global_buffer_overflow},
  {"heap_leak", heap_leak},
  {"heap_buffer_overflow", heap_buffer_overflow},
  {"heap_use_after_free", heap_use_after_free},
  {"stack_buffer_overflow", stack_buffer_overflow},
  {"container_deferred", container_deferred},
};

int main(int argc, char** argv) {
  if (argc != 2 || (argc == 2 && std::string("-h") == argv[1])) {
    for (auto& i : g_func) {
      std::cout << i.first << std::endl;
    }
    return 1;
  }
  auto func = g_func.find(argv[1]);
  if (func == g_func.end()) {
    std::cerr << "test function `" << argv[1] << "` not found" << std::endl;
  } else {
    func->second();
  }
  int cnt = 5;
  while (cnt--) {
    std::this_thread::sleep_for(std::chrono::seconds(1));
    __lsan_do_recoverable_leak_check(); // print to stdout if any leak detects
    // __lsan_do_leak_check(); // print and exit this process
  }
  return 0;
}

// vim: et tw=80 ts=2 sw=2 cc=80:
```

build, which will output the default executable `a.out`

```shell
g++ -ggdb -fsanitize=address -fno-omit-frame-pointer -static-libstdc++ -static-libasan -lrt memory_leak.cpp
```

Report example:  

`-fsanitize=address`, linux `./a.out heap_leak`.

```text
=================================================================
==15572==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 40344 byte(s) in 1 object(s) allocated from:
    #0 0x4d6f80 in operator new[](unsigned long) ../../../../gcc-7.3.0/libsanitizer/asan/asan_new_delete.cc:82
    #1 0x510c39 in heap_leak() /home/users/zhoufei05/workspace/c++/memory_leak.cpp:10
    #2 0x512f39 in std::_Function_handler<int (), int (*)()>::_M_invoke(std::_Any_data const&) /home/users/zhoufei05/installed-from-src/gcc/gcc730/include/c++/7.3.0/bits/std_function.h:302
    #3 0x512dd3 in std::function<int ()>::operator()() const /home/users/zhoufei05/installed-from-src/gcc/gcc730/include/c++/7.3.0/bits/std_function.h:706
    #4 0x51161c in main /home/users/zhoufei05/workspace/c++/memory_leak.cpp:62
    #5 0x7fed6e5d9bd4 in __libc_start_main (/opt/compiler/gcc-4.8.2/lib64/libc.so.6+0x21bd4)

SUMMARY: AddressSanitizer: 40344 byte(s) leaked in 1 allocation(s).
```

`-fsanitize=address`, linux `./a.out global_buffer_overflow`

```text
=================================================================
==360==ERROR: AddressSanitizer: global-buffer-overflow on address 0x000001485b90 at pc 0x000000511091 bp 0x7fff0257e2d0 sp 0x7fff0257e2c8
READ of size 4 at 0x000001485b90 thread T0
    #0 0x511090 in global_buffer_overflow() /home/users/zhoufei05/workspace/c++/memory_leak.cpp:40
    #1 0x512f39 in std::_Function_handler<int (), int (*)()>::_M_invoke(std::_Any_data const&) /home/users/zhoufei05/installed-from-src/gcc/gcc730/include/c++/7.3.0/bits/std_function.h:302
    #2 0x512dd3 in std::function<int ()>::operator()() const /home/users/zhoufei05/installed-from-src/gcc/gcc730/include/c++/7.3.0/bits/std_function.h:706
    #3 0x51161c in main /home/users/zhoufei05/workspace/c++/memory_leak.cpp:62
    #4 0x7f742afe9bd4 in __libc_start_main (/opt/compiler/gcc-4.8.2/lib64/libc.so.6+0x21bd4)
    #5 0x41c6d4  (/home/users/zhoufei05/workspace/c++/a.out+0x41c6d4)

0x000001485b90 is located 0 bytes to the right of global variable 'g_a' defined in 'memory_leak.cpp:37:5' (0x1485a00) of size 400
0x000001485b90 is located 48 bytes to the left of global variable 'g_func' defined in 'memory_leak.cpp:43:55' (0x1485bc0) of size 56
SUMMARY: AddressSanitizer: global-buffer-overflow /home/users/zhoufei05/workspace/c++/memory_leak.cpp:40 in global_buffer_overflow()
Shadow bytes around the buggy address:
  0x000080288b20: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x000080288b30: 00 00 00 00 00 00 00 00 01 f9 f9 f9 f9 f9 f9 f9
  0x000080288b40: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x000080288b50: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x000080288b60: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
=>0x000080288b70: 00 00[f9]f9 f9 f9 f9 f9 00 00 00 00 00 00 00 f9
  0x000080288b80: f9 f9 f9 f9 00 00 00 00 00 00 00 00 00 00 00 00
  0x000080288b90: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x000080288ba0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x000080288bb0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x000080288bc0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
Shadow byte legend (one shadow byte represents 8 application bytes):
  Addressable:           00
  Partially addressable: 01 02 03 04 05 06 07
  Heap left redzone:       fa
  Freed heap region:       fd
  Stack left redzone:      f1
  Stack mid redzone:       f2
  Stack right redzone:     f3
  Stack after return:      f5
  Stack use after scope:   f8
  Global redzone:          f9
  Global init order:       f6
  Poisoned by user:        f7
  Container overflow:      fc
  Array cookie:            ac
  Intra object redzone:    bb
  ASan internal:           fe
  Left alloca redzone:     ca
  Right alloca redzone:    cb
==360==ABORTING
```

and, other kinds of reports are similar, just try it yourself.

### deference between `-fsanitize=address` and `-fsanitize=leak` 

For `-fsanitize=address`, all kinds of leaks and overflows can be detected
accurately, that is to say the above program may detect and report all kinds of
"unsanitized" memory usage.

For `-fsanitize=leak`, it only detects the heap memory leak, say, memory `new`ed
but not `delete`d or access the heap memory out of range.

```shell
./a.out heap_leak
./a.out heap_buffer_overflow
```

and, the report does not distinguish that it is leak or overflow, it just says
"detected memory leaks". I personally suppose, **need proof**, this may save
more resource for detecting leaks than `-fsanitizer=address`.

```shell
=================================================================
==11129==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 40040 byte(s) in 1 object(s) allocated from:
    #0 0x419086 in operator new[](unsigned long) ../../../../gcc-7.3.0/libsanitizer/lsan/lsan_interceptors.cc:164
    #1 0x443171 in heap_buffer_overflow() /home/users/zhoufei05/workspace/c++/memory_leak.cpp:31
    #2 0x4440e7 in std::_Function_handler<int (), int (*)()>::_M_invoke(std::_Any_data const&) /home/users/zhoufei05/installed-from-src/gcc/gcc730/include/c++/7.3.0/bits/std_function.h:302
    #3 0x44405b in std::function<int ()>::operator()() const /home/users/zhoufei05/installed-from-src/gcc/gcc730/include/c++/7.3.0/bits/std_function.h:706
    #4 0x443441 in main /home/users/zhoufei05/workspace/c++/memory_leak.cpp:62
    #5 0x7fbb9fe25bd4 in __libc_start_main (/opt/compiler/gcc-4.8.2/lib64/libc.so.6+0x21bd4)

SUMMARY: LeakSanitizer: 40040 byte(s) leaked in 1 allocation(s).
```

### implementation
It is interesting how can it find and report the memory leak.
Take a look at the assembly code, we can see what's going on under the hood.
When `-fsanitize=address` turned on, some stubs, such as leak report, may be
inserted in the output assembly code, here is a snippet of code.

c++ code
```c++
int g_a[100];
int global_buffer_overflow() {
  std::cout << __PRETTY_FUNCTION__ << g_a[0] << std::endl;
  return g_a[100];
}
```

assembly code with `-fsanitize` turned on
```asm
global_buffer_overflow():
        push    rbp
        mov     rbp, rsp
        mov     esi, OFFSET FLAT:global_buffer_overflow()::__PRETTY_FUNCTION__
        mov     edi, OFFSET FLAT:_ZSt4cout
        call    std::basic_ostream<char, std::char_traits<char> >& std::operator<< <std::char_traits<char> >(std::basic_ostream<char, std::char_traits<char> >&, char const*)
        mov     rdx, rax
        mov     eax, DWORD PTR g_a[rip]
        mov     esi, eax
        mov     rdi, rdx
        call    std::basic_ostream<char, std::char_traits<char> >::operator<<(int)
        mov     esi, OFFSET FLAT:_ZSt4endlIcSt11char_traitsIcEERSt13basic_ostreamIT_T0_ES6_
        mov     rdi, rax
        call    std::basic_ostream<char, std::char_traits<char> >::operator<<(std::basic_ostream<char, std::char_traits<char> >& (*)(std::basic_ostream<char, std::char_traits<char> >&))
        mov     eax, OFFSET FLAT:g_a+400
        mov     rdx, rax
        mov     rax, rdx
        shr     rax, 3
        add     rax, 2147450880
        movzx   eax, BYTE PTR [rax]
        test    al, al
        setne   cl
        cmp     al, 3
        setle   al
        and     eax, ecx
        test    al, al
        je      .L72
        mov     rdi, rdx
        call    __asan_report_load4
.L72:
        mov     eax, DWORD PTR g_a[rip+400]
        pop     rbp
        ret
```

the complete code comparison is here <https://godbolt.org/z/p0r5vw>

### conclusion

If we want to enable address sanitizer for our programs, build with the
sanitizer options, better with `-fsanitizer=address`, and run the program.

The report is easy to read and analyse, try to find the bug according to the
call stack and line number.

The implementation/support of sanitizer is at compiler-level, which is
complicated (to me), compiler calculates where and when to insert stubs in the
output binary to collect, analyze and report the potential memory issues.

### reference
<https://github.com/google/sanitizers/wiki/AddressSanitizer>  
<https://lemire.me/blog/2016/04/20/no-more-leaks-with-sanitize-flags-in-gcc-and-clang/>  
<https://clang.llvm.org/docs/AddressSanitizer.html>  
<https://en.wikipedia.org/wiki/AddressSanitizer>  
