---
layout: post
title:  "从 shared_from_this() 谈智能指针 weak_ptr 和 shared_ptr 的实现"
date: 2020-08-05-Wed 17:05:49 +0800
categories: summary c++
tags: c++, gcc, shared_from_this, weak_ptr, shared_ptr
---

一般来说c++ `shared_ptr` 实现逻辑上基本上都是一个ptr加上一个control block来实现,
control block 用于保存引用计数以及如何回收(deleter)等信息,
有一些实现(gcc)会将ptr放到control block里,
有的(llvm libc++)则分开存放, 两种实现没有本质上的区别.

<!-- more -->

在llvm libc++实现里这个control block 就叫`__cntrl_`,
gcc实现里这个control block在代码里叫`__shared_count`,
不管具体如何实现一般我们在讲control block基本上都是在说refcount和deleter之类的信
息.

为了解决对象之间智能指针相互依赖/嵌套依赖的问题, c++引入了`weak_ptr`, `weak_ptr`
实现和`shared_ptr`是类似的也是一个ptr和一个control block.

接下来通过`shared_from_this()`的实现来解析/阐述`shared_ptr`和`weak_ptr`的实现和
关系.

先来看一段代码.

```c++
void foo(std::shared_ptr<Obj1>) {
  ...
}

class Obj1 : public enable_shared_from_tihs<Obj1> {
public:
  void bar() {
    foo(shared_from_this());
  }
};

```

上述例子中`Obj1::bar()`调用了`foo()`, 如果`Obj1`没有继承
`enable_shared_from_this`, 是没有办法解决生命周期的问题的.

(虽然一般情况下我们是不应该写出上述结构的代码, 但是如果`foo()`是另外一个类的构造
函数的话, 形成了嵌套依赖就会写出这样的代码来了)

`enable_shared_from_this`(CRTP)实现上用了一个 `weak_ptr` 作为成员,
`weak_ptr` 管理着智能指针的 ptr 和 control block(weak_count, use_count),
当调用`shared_from_this()` 实际上就是用`weak_ptr`构造一个`shared_ptr`


```c++
template<typename _Tp>
class enable_shared_from_this {
...

shared_ptr<_Tp>
shared_from_this()
{ return shared_ptr<_Tp>(this->_M_weak_this); }

...

mutable weak_ptr<_Tp>  _M_weak_this;

};
```

需要注意的是这里并不是通过`weak_ptr.lock()`得到的`shared_ptr`, 这是因为这个
`weak_ptr`所引用的`shared_ptr`必然存在(use_count必然不为0).

c++标准库要求, 如果要调用`shared_from_this()`, 则这个对象的指针必须是被
`shared_ptr`所管理的, 不然直接调用会抛异常, 如下:

```c++
{
  auto obj = std::make_shared<Obj1>()
  obj->shared_from_this();       // legal
  obj.get()->shared_from_this(); // legal
}

{
  auto obj = new Obj1();
  obj->shared_from_this(); // illegal, bad_ptr exception throwed
}
```

这里边有两个点比较有意思:
1. 为什么纯纯的裸指针在调用 `shared_from_this()` 的时候能知道要拋异常(标准库要求
	 拋), 换句话来说就是为什么能够知道一个裸指针有没有被`shared_ptr`所管理?
2. 如果第1点中实现上跟`weak_ptr`的control block(引用计数)有关系, 那么
	 `shared_ptr`的构造函数又是怎么通过一个"普通"的类来影响`weak_ptr`的引用计数的?

第一个点比较好解释, 因为之前也说过, `enable_shared_from_this` 这个类有一个
`weak_ptr`成员, 而它里有control block(引用计数), 它可以默认初始化为0,
可以通过判断这个引用计数来判断是否被`shared_ptr`所管理.

第二个点比较难解释, 需要再深入分析源码实现才能得出结论, 直觉上应该是在
`shared_ptr<Obj1>(new Obj1)` 这样的构造函数的时候去判断它是否是一个
`enable_shared_from_this` 并且对其`weak_ptr`成员的control block做了一些手脚.

以下分析源码来自gcc10.0.

从`shared_ptr`的构造函数开始, 值分析我们需要关注的那个,
这个模板参数用的是`_Tp`, 但是构造函数用的却是`_Yp`,
这里就需要进行更多的类型推导了, 这里边有有个比较重要的原因: 为了多态.
有了这个, 我们就可以用派生类的指针构造基类的`shared_ptr`, 同时也能够在推导的时候
得到一些基类的信息, 这个是实现`shared_from_this()`的关键.

```c++
template<typename _Tp>
class shared_ptr : public __shared_ptr<_Tp> {
...

  /**
   *  @brief  Construct a %shared_ptr that owns the pointer @a __p.
   *  @param  __p  A pointer that is convertible to element_type*.
   *  @post   use_count() == 1 && get() == __p
   *  @throw  std::bad_alloc, in which case @c delete @a __p is called.
   */
  template<typename _Yp, typename = _Constructible<_Yp*>>
  explicit shared_ptr(_Yp* __p) : __shared_ptr<_Tp>(__p) { }
...
};
```

同时我们可以观察到 这个暴露出来的`shared_ptr`继承自`__shared_ptr`, 后者才是真正
的实现. 同样我们只关注关键的构造函数.

```c++
template<typename _Tp>
class __shared_ptr {
...
  template<typename _Yp, typename = _SafeConv<_Yp>>
  explicit
  __shared_ptr(_Yp* __p)
    : _M_ptr(__p), _M_refcount(__p, typename is_array<_Tp>::type())
  {
    static_assert( !is_void<_Yp>::value, "incomplete type" );
    static_assert( sizeof(_Yp) > 0, "incomplete type" );
    _M_enable_shared_from_this_with(__p);
  }
...
};
```

看到这里我们看到初始化`shared_ptr`很关键的东西 ptr(`_M_ptr`) 和
control block(`_M_refcount`)了, 
因为`enable_shared_from_this` 这个类里的 `weak_ptr`也有一份,
如果这两个东西在这里有单独的一份, 那么`shared_ptr`不能对
`enable_shared_from_this` 里的 `weak_ptr` 造成影响,
同时也可以看到一个似曾相识的东西: `_M_enable_shared_from_this_with`.

顺着这段代码一步一步看

```c++
template<typename _Tp, typename _Lp>
class __shared_ptr : public __shared_ptr_access<_Tp, _Lp> {
...
  template<typename _Yp, typename _Yp2 = typename remove_cv<_Yp>::type>
  typename enable_if<__has_esft_base<_Yp2>::value>::type
  _M_enable_shared_from_this_with(_Yp* __p) noexcept
  {
    if (auto __base = __enable_shared_from_this_base(_M_refcount, __p))
      __base->_M_weak_assign(const_cast<_Yp2*>(__p), _M_refcount);
  }

  element_type*	   _M_ptr;         // Contained pointer.
  __shared_count<_Lp>  _M_refcount;    // Reference counter.
...
};

class enable_shared_from_this {
...
  // Found by ADL when this is an associated class.
  friend const enable_shared_from_this*
  __enable_shared_from_this_base(const __shared_count<>&,
                                 const enable_shared_from_this* __p)
  { return __p; }

  template<typename _Tp1>
  void
  _M_weak_assign(_Tp1* __p, const __shared_count<>& __n) const noexcept
  { _M_weak_this._M_assign(__p, __n); }
...
};

// weak_ptr is just a wrapper of __weak_ptr in gcc10.0
class weak_ptr : public __weak_ptr {
};

template<typename _Tp, _Lock_policy _Lp>
class __weak_ptr {
...

  element_type*	 _M_ptr;             // Contained pointer.
  __weak_count<_Lp>  _M_refcount;    // Reference counter.

  long
  use_count() const noexcept
  { return _M_refcount._M_get_use_count(); }

  // Used by __enable_shared_from_this.
  void
  _M_assign(_Tp* __ptr, const __shared_count<_Lp>& __refcount) noexcept
  {
    if (use_count() == 0)
      {
        _M_ptr = __ptr;
        _M_refcount = __refcount;
      }
  }
...
};
```

`weak_ptr` 只是简单继承了`__weak_ptr` 并且对外暴露了c++标准库定义的对外提供的标
准接口, `weak_ptr` 并没有单独定义成员变量.

上述代码虽然比较长, 但是比较简单, 它就是一个简单的依赖关系,
`shared_ptr`有个 `__shared_count`,
`weak_ptr`有个 `__weak_count`.

其中, 最关键的一步在`_M_assign()` 这个函数, 它的意思是是说,
如果当前这个`weak_ptr`是没有被`shared_ptr`初始化过的(`use_count() == 0`),
就assign `shared_ptr` 相关的信息到`weak_ptr` 里,
后续我们也会看到这个`use_count()` 的具体实现.

这个assign 是将一个 `__shared_count<>` 用来初始化一个 `__weak_count<>`, 入参
是一个 `const&`, 虽然当前还没看到指针, 但是这个底层实现
**肯定会有相关的指针操作**.

接下来分析这两个类型的count, 详细看一下是如何交互的.

```c++
template<_Lock_policy _Lp>
class __weak_count {
...
  __weak_count& operator=(const __shared_count<_Lp>& __r) noexcept
  {
    _Sp_counted_base<_Lp>* __tmp = __r._M_pi;
    if (__tmp != nullptr)
      __tmp->_M_weak_add_ref();
    if (_M_pi != nullptr)
      _M_pi->_M_weak_release();
    _M_pi = __tmp;
    return *this;
  }

  long
  _M_get_use_count() const noexcept
  { return _M_pi != nullptr ? _M_pi->_M_get_use_count() : 0; }

  _Sp_counted_base<_Lp>*  _M_pi;
...
};


template<_Lock_policy _Lp>
class __shared_count {
...
  template<typename _Ptr>
  explicit
  __shared_count(_Ptr __p) : _M_pi(0)
  {
    __try
      {
        _M_pi = new _Sp_counted_ptr<_Ptr, _Lp>(__p);
      }
    __catch(...)
      {
        delete __p;
        __throw_exception_again;
      }
  }

  _Sp_counted_base<_Lp>*  _M_pi;
...
};


template<typename _Ptr, _Lock_policy _Lp>
class _Sp_counted_ptr final : public _Sp_counted_base<_Lp>
{
...
  _Sp_counted_ptr(_Ptr __p) noexcept
  : _M_ptr(__p) { }
...
};


template<_Lock_policy _Lp = __default_lock_policy>
class _Sp_counted_base : public _Mutex_base<_Lp> {
...
  _Sp_counted_base() noexcept : _M_use_count(1), _M_weak_count(1) { }

  void _M_add_ref_copy()
  { __gnu_cxx::__atomic_add_dispatch(&_M_use_count, 1); }

  void _M_release() noexcept
  {
    // Be race-detector-friendly.  For more info see bits/c++config.
    _GLIBCXX_SYNCHRONIZATION_HAPPENS_BEFORE(&_M_use_count);
    if (__gnu_cxx::__exchange_and_add_dispatch(&_M_use_count, -1) == 1)
      {
        _GLIBCXX_SYNCHRONIZATION_HAPPENS_AFTER(&_M_use_count);
        _M_dispose();
        // There must be a memory barrier between dispose() and destroy()
        // to ensure that the effects of dispose() are observed in the
        // thread that runs destroy().
        // See http://gcc.gnu.org/ml/libstdc++/2005-11/msg00136.html
        if (_Mutex_base<_Lp>::_S_need_barriers)
          {
            __atomic_thread_fence (__ATOMIC_ACQ_REL);
          }

        // Be race-detector-friendly.  For more info see bits/c++config.
        _GLIBCXX_SYNCHRONIZATION_HAPPENS_BEFORE(&_M_weak_count);
        if (__gnu_cxx::__exchange_and_add_dispatch(&_M_weak_count,
                                                   -1) == 1)
          {
            _GLIBCXX_SYNCHRONIZATION_HAPPENS_AFTER(&_M_weak_count);
            _M_destroy();
          }
      }
  }

  void _M_weak_add_ref() noexcept
  { __gnu_cxx::__atomic_add_dispatch(&_M_weak_count, 1); }

  void _M_weak_release() noexcept
  {
    // Be race-detector-friendly. For more info see bits/c++config.
    _GLIBCXX_SYNCHRONIZATION_HAPPENS_BEFORE(&_M_weak_count);
    if (__gnu_cxx::__exchange_and_add_dispatch(&_M_weak_count, -1) == 1)
      {
        _GLIBCXX_SYNCHRONIZATION_HAPPENS_AFTER(&_M_weak_count);
        if (_Mutex_base<_Lp>::_S_need_barriers)
          {
            // See _M_release(),
            // destroy() must observe results of dispose()
            __atomic_thread_fence (__ATOMIC_ACQ_REL);
          }
        _M_destroy();
      }
  }

  _Atomic_word  _M_use_count;     // #shared
  _Atomic_word  _M_weak_count;    // #weak + (#shared != 0)
...
};
```

上述代码几乎是关键路径的所有相关代码了, 从头往后读即可知道其原理.

接下来拆解这段代码.

首先, 从上述代码的开头, 可以看到`weak_ptr` 通过`shared_ptr`构造的关键语句,

```c++
_M_refcount = __refcount;
```

这两种count 都有一个成员`_Sp_counted_base<_Lp>* _M_pi`, 其实就是control block的
具体实现, 其实本质上是将一个control block指针直接复赋值, 这也就解答了前边两种
count是如何交互的.

就是说`weak_ptr` 使用默认构造函数的时候 其实是没有control block的, 它的`_M_pi`
是`nullptr`, 这也就能说明前边提到的如何判断一个`enable_shared_from_this`是不是被
一个`shared_ptr`所管理, 本质就是简单看一下它的control block指针是不是`nullptr`

```c++
  long
  _M_get_use_count() const noexcept
  { return _M_pi != nullptr ? _M_pi->_M_get_use_count() : 0; }
```

`weak_ptr`的`weak_count`是不会生成control block的, 只有`shared_ptr`才会去new 一
个control block, 如果有`weak_ptr`相关操作再把这个指针传过去.

```c++
  __shared_count(_Ptr __p) : _M_pi(0)
  {
    __try
      {
        _M_pi = new _Sp_counted_ptr<_Ptr, _Lp>(__p);
  ...
```

注意这个地方, 用的是 `_Sp_counted_ptr` 是一个`_Sp_counted_base`的派生类,
对于通过普通类型的指针构建`shared_ptr`专用的control block,
目的是增加ptr成员. `_Sp_counted_base`的派生类类还有:

* `_Sp_counted_deleter` 用于构造带deleter 的`shared_ptr`(`__shared_count`), 它保
	存了用户指定的deleter
* `_Sp_counted_ptr_inplace` 用于构造指定allocator并且带deleter 的
	`shared_ptr`(`__shared_count`), 它使用用户指定的allocator进行内存申请和对象构
	造

这也解释了为什么gcc的实现上对refcount进行了抽象然后进行派生选择control block的实
现, 这也体现了c++的设计原则["zero overhead principle"](https://en.cppreference.com/w/cpp/language/Zero-overhead_principle):

> The zero-overhead principle is a C++ design principle that states:
>
> You don't pay for what you don't use.
> What you do use is just as efficient as what you could reasonably write by hand.

这里也顺便提一下 `_Lock_policy` 这是non-type template, 就是决定这个control
block 里边要上哪些类型的锁(选用哪种类型的atomic count),
对于一些硬件平台引用计数的操作可能需要上锁, 源码里有很多特化. 要兼容不同的硬件平
台标准库考虑的也是很周到的, 这也是为什么一个新的标准推出往往需要很长时间的原因.

```c++
  template<>
    inline void
    _Sp_counted_ptr<nullptr_t, _S_single>::_M_dispose() noexcept { }

  template<>
    inline void
    _Sp_counted_ptr<nullptr_t, _S_mutex>::_M_dispose() noexcept { }

  template<>
    inline void
    _Sp_counted_ptr<nullptr_t, _S_atomic>::_M_dispose() noexcept { }
```

接下来就是引用计数的一些相关操作了, gcc在一个`shared_ptr`上统计了两个引用
一个是weak, 一个shared. 这也是`weak_ptr` 和 `shared_ptr` 的秘密所在.

```c++
  _Atomic_word  _M_use_count;     // #shared
  _Atomic_word  _M_weak_count;    // #weak + (#shared != 0)
```

`_M_weak_count`的值为所有`weak_ptr`的个数以及`shared_ptr`的个数, 因为
`shared_ptr`在构造的时候就将`_M_weak_count`置1

```c++
  __shared_count(_Ptr __p) : _M_pi(0)
  {
    __try
      {
        _M_pi = new _Sp_counted_ptr<_Ptr, _Lp>(__p);
  ...

  template<typename _Ptr, _Lock_policy _Lp>
  class _Sp_counted_ptr final : public _Sp_counted_base<_Lp> {
    _Sp_counted_ptr(_Ptr __p) noexcept : _M_ptr(__p) { }

  ...
  _Sp_counted_base() noexcept : _M_use_count(1), _M_weak_count(1) { }
```

关于引用计数如何增加减少,

* 在`shared_ptr`构造的时候 `_M_add_ref_copy()`, 先增加引用计数后赋值ptr
* 在`shared_ptr`析构的时候 `_M_release()`, 减少`_M_use_count`以及`_M_weak_count`
* 在`weak_ptr`构造的时候 `_M_weak_add_ref()`
* 在`weak_ptr`析构的时候 `_M_weak_release()`

在`_M_release()`的时候(`shared_ptr`析构)判断是否需要释放资源,
释放的资源包括ptr 和 control block本身:
* 如果`_M_use_count == 0`, 则 `_M_dispose()` 就是 reclaim ptr
* 如果`_M_use_count == 0`, 在完成`_M_dispose()` 之后, 并且`_M_weak_count == 0`
	则`_M_destroy()` -- reclaim control block

在`_M_weak_release()`的时候(`weak_ptr`析构)判断是否需要释放资源,
`weak_count` 仅仅能用判断是否需要释放control block 本身:
* 如果`_M_weak_count == 0`, 则 `_M_destroy()` 就是 reclaim control block
	这里不需要判断`_M_use_count`是因为`_M_weak_count`为1的时候
	`_M_use_count`已经等于0了

**注意, 要保证 reclaim exactly once 所有判断条件必须为0.**

一般来说count值是0, 但是不排除除了在析构函数之外还有其他地方会decrease 这些
count, 为了减少bug, 判断等于0是正确且合适的行为.

相关详细实现参考gcc的标准库源码, gcc实现里详细说明了memory order的相关操作.
memory order的相关内容也可以参考[我之前的这个文章](http://gavinchou.github.io/summary/c++/memory-ordering/),
其中有个章节详细讲了智能指针引用计数使用原子变量的注意事项和问题.

## demo

以下有一个相关的demo, 可供参考. 如果使用clang的话, 改一下对应的成员即可.

```c++
#define TEST233

#ifdef TEST233
#define TEST233_TAG R"(weak_ptr shared_from_this)"
const char* testDescription = "TEST233 2020-08-05-Wed 15:44:30 " TEST233_TAG;
#include <iostream>

// access private members of weak_ptr shared_ptr
#define private public

#include <memory>

#undef private

// g++1000 -std=c++17 tmp.cpp  && ./a.out

class C;

void foo(const std::shared_ptr<C>& p);

// objects <T> that inherit std::enable_shared_from_this<> will have a weak_ptr,
// the weak_ptr initiates with ptr to `this` and use count
class C : public std::enable_shared_from_this<C> {
public:
  ~C() {
    std::cout << __PRETTY_FUNCTION__
      << ", use_count() " << _M_weak_this.use_count()
      << ", _M_use_count " << _M_weak_this._M_refcount._M_pi->_M_use_count
      << ", _M_weak_count " << _M_weak_this._M_refcount._M_pi->_M_weak_count
      << std::endl;;
  }

  void ref() {
    std::cout << __PRETTY_FUNCTION__ << " === ";
    // shared_from_this() increases use_count by 1, because it create a shared
    // pointer
    foo(shared_from_this());
  }
};

void foo(const std::shared_ptr<C>& p) {
  std::cout << __PRETTY_FUNCTION__
      << ", use_count() " << p->_M_weak_this.use_count()
      << ", _M_use_count " << p->_M_weak_this._M_refcount._M_pi->_M_use_count
      << ", _M_weak_count " << p->_M_weak_this._M_refcount._M_pi->_M_weak_count
      << std::endl;;
}

void test() {
  // this constructor of shared_ptr increase the use count of C
  std::shared_ptr<C> c(new C());
  std::cout << __PRETTY_FUNCTION__ << " shared_ptr.use_count() "
    << c.use_count() << std::endl;
  c->ref();
  foo(c);
  std::weak_ptr<C> wc(c);
  wc.lock()->ref();
}

int main(int argc, char** argv) {
  for (int i = 0; i < argc; ++i) { std::cout << argv[i] << " "; }
  std::cout << std::endl << testDescription << std::endl;
  test();
  return 0;
}
#endif // TEST233
// vim: et tw=80 ts=2 sw=2 cc=80:
```

## multiple inheritance of shared_from_this

可以看到shared_from_this() 实现上依赖基类的weak_ptr, 所以

<https://www.codeproject.com/Articles/286304/Solution-for-multiple-enable-shared-from-this-in-i>

## 总结

上述代码解析只解析了一小部分c++智能指针的实现(最普通的`shared_ptr`和`weak_ptr`构
建以及联系), 除了`uniqe_ptr`之外(unique_ptr相对来说还是比较点单的)
还有非常多的细节没有描述, 但是本文描述了智能指针比较关键的逻辑.

整个memory里边其实都是闭环的, 智能指针之间的相互依赖是成体系的. 就是说每一种智能
指针的用途是明确的, 并且有着自己特定的功能, 语义上很明确, 如果不同类型的指针发生
了相互的依赖引用关系, 标准库都保持了他们各自的特性.

llvm libc++的智能指针的实现和gcc的总体思路类似,
llvm libc++ 对接口封装用的组合模式, gcc用的派生模式.
libc++相比于gcc的实现**看起来**更简洁一点.

llvm libc++一个文件`<memory>`就包含了几乎所有的主要逻辑, 但是因为它还隐藏了一些
具体的实现放到了libc++的cpp文件里(比如`weak_ptr`的`lock()`),
所以它**看起来**比较简洁, 但是实际上理解起来跟gcc的难度差不多.

gcc的实现嵌套了两个文件, 和若干个派生类, 但是它把所有的实现都在头文件中实现了,
可以看到所有的细节.

## ref
* [gcc 10.0]()
* [memory ordering](http://gavinchou.github.io/summary/c++/memory-ordering/)
