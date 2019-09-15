---
layout: post
title:  "braft call graph"
date: 2019-09-15-Sun 10:29:48 +0800
categories: summary
tags: raft braft graphviz
---

This is the call graph of [braft](https://github.com/brpc/braft),
an industrial grade raft implementation, which may help you understand braft
better, I think.

I made it several months ago with dot-lang (graphviz), 
and build the svg with my [graphviz plugin](https://github.com/gavinchou/dot-build-tool),
the nodes are clickable.

I also have made call graphs of other projects such as [thrift](https://github.com/apache/thrift),
[brpc](https://github.com/brpc/brpc) and etc..
They will be posted when I have time to eliminate the parts that are not proper
for publication.

Legend:
* each enclosed shape is called a node
	* ellipse for procedure
	* square for note/comment
* solid arrow for "sync" call/procedure
* dash connection or dash arrow for "async" call/procedure or something that is
	indirectly associated, e.g., background thread, queue of a thread pool
* number on the connection means process sequence
* element in red color means important

(click this image to get svg view with interaction)
<img src="/images/raft.svg" width="800">
