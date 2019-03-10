---
layout: post
title:  "list initialization and std::initializer_list"
date: 2019-03-10-Sun 02:29:50 +0800
categories: experience summary syntax
tags: c++ C++11 initializer_list list initialization
---

## C++, C++11, initializer_list, emplace, emplace_back, list initialization
time: 2019-03-10-Sun 02:29:50

### List initialization, since C++11

List initialization is a "new" **syntax support (sugar)** since C++11, the main
idea is to initialize object with a given list of arguments in `enclosed brace`
for initialization.

direct-list-initialization

```
T object { arg1, arg2, ... };                  (1)
T { arg1, arg2, ... }                          (2)
new T { arg1, arg2, ... }                      (3)
Class { T member { arg1, arg2, ... }; };       (4)
Class::Class() : member{arg1, arg2, ...} {...  (5)
```
<!-- more -->

copy-list-initialization

```
T object = {arg1, arg2, ...};                  (6)
function( { arg1, arg2, ... } )                (7)
return { arg1, arg2, ... } ;                   (8)
object[ { arg1, arg2, ... } ]                  (9)
object = { arg1, arg2, ... }                   (10)
U( { arg1, arg2, ... } )                       (11)
Class { T member = { arg1, arg2, ... }; };     (12)
```

The rule is simple, order of arguments in braced-init-list match the
corresponding constructor's, compiler will pick the ctor according the given
list.

For POD type (pure struct), there will be a default list-initialization
constructor which tasks arguments as the member variable.

```cpp
struct S {
  std::string str1;
  int a1;
  std::string str2;
  std::string str3;
};

S s1 {"abc", 1, "bbb", "ccc"}; // ok, will init in order
S s2 {"abc", 1, {"bbb"}, "ccc"}; // ok
```

Note that a braced-init-list is not an expression and therefore **has no type**,
e.g.  `decltype({1,2})` is ill-formed, it can not be deduced when using a
template.

For more explanation of `list initialization`, check this [site](https://en.cppreference.com/w/cpp/language/list_initialization)

With this syntax support we can initialize a `std::pair<std::string, int>`

```cpp
std::pair<std::string, int> p {"10086", 10010};
```

to initialize a `std::vector<std::pair<std::string, int>>` as

```cpp
std::vector<std::pair<std::string, int>> v {
  {"10000", 200},
  {"10010", 300},
  {"10086", 400},
};
```

However, we can simplify initialization of
`std::vector<std::pair<std::string, int>>` not only with help of
`list-initialization` but also with help of `std::initializer_list`.

### Initializer list

> An object of type std::initializer_list<T> is a lightweight proxy object that
> provides access to an array of objects of type const T.
> 
> A std::initializer_list object is automatically constructed when:
> 
> * a braced-init-list is used to list-initialize an object, where the
>   corresponding constructor accepts an std::initializer_list parameter
> * a braced-init-list is used as the right operand of assignment or as a
>   function call argument, and the corresponding assignment operator/function
>   accepts an std::initializer_list parameter
> * a braced-init-list is bound to auto, including in a ranged for loop
>
> Initializer lists may be implemented as a pair of pointers or pointer and
> length. Copying a std::initializer_list does not copy the underlying objects.

The `initializer_list` template only accept only one type `T`, it's usually used
for container initialization.

`std::vector` has a constructor of `std::initlizaer_list`, possible
initialization is 

```cpp
template<typename T>
std::vector(std::initializer_list<T> l) {
  reserve(l.size());
  for (auto& i : l) {
    emplace_back(i); // may be move here
  }
}
```

### Usage of std::initializer_list

Essentially, `std::initializer_list` is a list of arguments we want to pass, the
number of elements in initializer list is not fixed.

We can iterate the list over with iterator or `range-for`

```cpp
void foo(std::initializer_list<std::string> l) {
  auto it = l.begin();
  while (it != l.end()) {
    std::cout << *it;
    ++it;
  }

  // or range for
  for (auto& i :  l) {
    std::cout << l;
  }
}

void foo(std::initializer_list<std::string> l) {
  if (l.size() < 5) { // l.size() is not a constexpr
    throw std::logic_error();
  }
}
```

One more thing to say, e.g., there is a declaration

```cpp
Foo::Foo(int);
```

`foo(1)` and `foo({1})` is the same to call that function, however this
will cause gcc or clang to warn

```
braces around scalar initializer
```

You should remove the braces: { and } around single value, gcc/clang thinks it
is verbose to do that for a single scalar type.

And the priority for matching is the same as that for overloading.

```cpp
Foo::Foo(std::initializer_list<std::stirng>); // ctor2
Foo::Foo(std::string); // ctor3
```

It's not ambiguous, a call of `Foo(std::string)` will match ctor3 exactly, no
warning.

### Explicitly declare type/use of initializer_list for template

The `emplace` or `emplace_back` for containers take arbitrary arguments for the
element type constructor.

The common implementation, gcc or clang, is following (pseudo code)

```cpp
template<>
vector.emplace_back(Args&&... args) {
  // placement_new and then
  ctor(std::forward<Args&&>(args)...);
}

// almost the same as empalce
template<>
set.emplace(Args&&... args)
```

There is an arguments forwarding, if we write down something like the following,
the compiler will be confused when deduce the template for constructor, it keeps
the `{}` thing, raw initialize_list `<brace-enclosed initializer list>`, all
through the deduction, **it has no type**, which will not make any sense for
deduction.

The simple one

```cpp
// wont compile
std::vector<std::vector<int>> vv({1, 2, 3});
```

or, there is a more complicated one

```cpp
struct Range {
  Range(std::initializer_list<std::string>) {
    std::cout << __PRETTY_FUNCTION__ << std::endl;
  }
};

struct Tablet {
  Tablet(int64_t, const Range&, int64_t) { // ctor1
  }
  Tablet(int64_t, std::initializer_list<std::string>, int64_t) { // ctor2
  }
};

void test_emplace() {
  std::vector<Tablet> v;
  v.emplace_back(1, Range("10", "20"), 2); // ok, ctor1
  v.emplace_back(1, Range{"10", "20"}, 2); // ok, ctor1

  //  no matching function for call to
  //  ‘std::vector<Tablet>::emplace_back(int, <brace-enclosed initializer list>, int)’
  // v.emplace_back(1, {"10", "20"}, 2);

  // explicitly declare what is the init list for
  v.emplace_back(1, (std:initializer_list<std::string>){"10", "20"}, 2); // ok, ctor2
  v.emplace_back(1, (Range){"10", "20"}, 2); // ok, ctor1
  // or
  v.emplace_back(1, std:initializer_list<std::string> {"10", "20"}, 2); // ok, ctor2
  v.emplace_back(1, Range {"10", "20"}, 2); // ok, ctor1
}
```

We should **explicitly** "declare" what the `<brace-enclosed initializer list>`
is in the template function, be aware of that the following is
**not a type cast**, it's just like a "declaration" to specify the type/use of
that initializer list.

```cpp
(std:initializer_list<std::string>){"10", "20"}
(Range){"10", "20"}
```

The above code is something more like `(void) a; // avoid unused waring`,
it can also be written as

```cpp
std:initializer_list<std::string> {"10", "20"}
Range {"10", "20"}
```

Apparently, the following wont compile, it's a syntax error, because `{...}` is
being deduced without any context, which will certainly fail.

```cpp
static_cast<std:initializer_list<std::string>>({"10", "20"})
static_cast<Range>({"10", "20"})
```

### Conclusion

* list initialization is convenient for use
* raw initializer list, A.K.A, braced-init-list has no type
* do not pass a braced-init-list for template deduction, "assign" (declare) it a
	"type" explicitly
* passing `std::initializer_list` by value is very cheap, don't worry about
	performance

### Reference

<https://stackoverflow.com/questions/24550924/emplacement-of-a-vector-with-initializer-list>  
<https://en.cppreference.com/w/cpp/language/list_initialization>  
<https://en.cppreference.com/w/cpp/utility/initializer_list>  
