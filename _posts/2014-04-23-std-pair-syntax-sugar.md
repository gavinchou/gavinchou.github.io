---
layout: post
title:  "std::pair<T1, T2> syntax sugar"
date: 2014-04-23 09:15:01 +0800
categories: experience summary c++ syntax
tags: c++
---

## std::pair<T1, T2> syntax sugar
通常标准库的函数(`multimap::equal_range`, `map::insert`等)或者会返回一些`std::pair`,
这些`pair`中的`first`, `second`有的代表`lowerbound`, `upperbloud`, 有的代表是否插入成功以及
相应的插入位置, 在代码比较多的时候往往不是那么好记.
 
另外, 当我们自己想用pair来代表两个有一定关联的数据的时候, 最直接的方式是使用`std::pair`,
但是`pair`中的`first`, `second`又不是那么的能表达代码的含义.
 
<!-- more -->
所以, 在实际写代码的时候, 我在思考有没有一个比较好的方式来封装这个`std::pair`来赋予`first`,
`second`一些含义呢?
 
以下为我找到的一种方式, 用宏来做了一个`std::pair`的"alias", 我叫它`NAMED_PAIR`.
 
 
```
#define TEST11_TAG "custome std::pair test"
const char* testDescription = "TEST11 2015-10-15-Thu 13:28:40 " TEST11_TAG;
#include <iostream>
#include <map>
 
// define macro to generate pair with custom field names
#define NAMED_PAIR(pair_name, type1, type2, name1, name2) \
  struct pair_name : public std::pair<type1, type2> { \
    type1& name1; \
    type2& name2; \
    pair_name(): name1(first), name2(second) {} \
    pair_name(type1 a, type2 b): \
        std::pair<type1, type2>(a, b), name1(first), name2(second) {} \
    pair_name& operator=(const std::pair<type1, type2>& other) { \
      this->name1 = other.first; \
      this->name2 = other.second; \
      return *this; \
    } \
    pair_name& operator=(const pair_name& other) { \
      this->name1 = other.name1; \
      this->name2 = other.name2; \
      return *this; \
    } \
    pair_name(const std::pair<type1, type2>& other): \
          name1(first), name2(second) { \
      this->first = other.first; \
      this->second = other.second; \
    } \
    pair_name(const pair_name& other): name1(first), name2(second) { \
      this->first = other.first; \
      this->second = other.second; \
    } \
  };
 
// function works with parameter of std::pair<> only
template<typename T1, typename T2>
void f1(const std::pair<T1, T2>& p) {
  std::cout << __PRETTY_FUNCTION__ << std::endl;
  std::cout << p.first << " -> " << p.second << std::endl;
}
 
int main(int argc, char** argv) {
  std::cout << testDescription << std::endl;
 
  NAMED_PAIR(Range, int, int, lowerbound, upperbound);
  Range mp;
  mp.lowerbound = 1;
  mp.upperbound = 2;
  f1(mp);
  Range mp2(3, 4);
  f1(mp2);
 
  // declare it with macro
  NAMED_PAIR(Person, std::string, int, name, age);
 
  // works perfectly with function with parameter of std::pair<>
  Person sp1;
  sp1.name = "gavin";
  sp1.age = 26;
  Person sp2("aaa", 10);
  f1(sp1);
  f1(sp2);
 
  // convert from std::pair<> to custom pair withou any side effect
  std::pair<std::string, int> std_pair;
  std_pair.first = "abc";
  std_pair.second = 120;
 
  Person sp3;
  sp3 = std_pair;
  f1(sp3);
 
  std::multimap<std::string, int> mm = {
      {"a", 1},
      {"a", 2},
      {"a", 3},
      {"a", 4},
      {"b", 5},
      {"b", 6},
      {"b", 7},
      {"b", 8},
    };
  // make equal_range() return value much more readable
  typedef std::multimap<std::string, int>::iterator MultimapIter;
  NAMED_PAIR(MutilmapEqualRange, MultimapIter, MultimapIter, lowerbound, upperbound);
  MutilmapEqualRange erange2 = mm.equal_range("b");
  // new way, with readable pair member
  for (auto i = erange2.lowerbound; i != erange2.upperbound; ++i) {
    std::cout << i->first << " -> " << i->second << std::endl;
  }
  
  auto erange1 = mm.equal_range("a");
  // old way, with direct std::pair
  for (auto i = erange1.first; i != erange1.second; ++i) {
    std::cout << i->first << " -> " << i->second << std::endl;
  }
 
  std::map<std::string, int> m = {
      {"a", 1},
    };
  typedef std::map<std::string, int>::iterator MapIter;
  NAMED_PAIR(MapInsertRet, MapIter, bool, iterator, insert_succ);
  MapInsertRet ret = m.insert(std::make_pair<std::string, int>("a", 2));
  // 0 a -> 1
  std::cout << ret.insert_succ << " " 
    << ret.iterator->first << " -> " << ret.iterator->second << std::endl;
  ret = m.insert(std::make_pair<std::string, int>("b", 2));
  // 1 b -> 2
  std::cout << ret.insert_succ << " " 
    << ret.iterator->first << " -> " << ret.iterator->second << std::endl;
 
  // a pratical example
  NAMED_PAIR(CopyPartResponse, int, std::string, part_number, response);
  NAMED_PAIR(CopyPartResponseWithStatus, bool, CopyPartResponse, is_succ, response);
  CopyPartResponseWithStatus res1 = {false, {1, "abc"}};
 
  // old way, use std::pair<>, too many "first"s and "second"s, hard to remember the meaning of each field
  std::cout << "succ: " << res1.first << " part number: "
    << res1.second.first << " response: " << res1.second.second << std::endl;
 
  // new way, use NAMED_PAIR, more clear
  std::cout << "succ: " << res1.is_succ << " part number: "
    << res1.response.part_number << " response: " << res1.response.response << std::endl;
 
  return 0;
}

```
