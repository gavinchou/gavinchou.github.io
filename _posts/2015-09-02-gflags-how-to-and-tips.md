---
layout: post
title:  "gflags' How-To and Tips"
date: 2015-09-02 21:06:26 +0800
comments: true
categories: experience summary
tags: gflag
---

2. define flags in header files or cpp files which invoke the flags

	define flags with initial values

		DEFINE_bool(debug_mode, true, "if debug mode enabled");
		DEFINE_int32(port, 8899, "TCP port for server");
		DEFINE_int32(libbp_log_level, 4, "explanation");


	or, just define them

		DEFINE_bool(debug_mode);
		DEFINE_int32(port);
		DEFINE_int64(log_level);

<!-- more -->

2. in flag file, there should not be any spaces between flag and value, or the
	flag my be null

	correct, `FLAGS_my_flag` will be `a b c` or `"abc"`, pay attion to the spaces

		-my_flag=a b c
		-my_flag="abc"

	<font color=#ff0000>***wrong***</font>, `FLAGS_my_flag` will be empty (nothing)

		-my_flag = abcded

2. define flags with file or command line
	1. with default flagfile

		the following code must be invoked in the your code fisrt

			google::SetCommandLineOption("flagfile", "default_flag_file_path")

	2. with specific flagfile

			your_prog_with_gflags -flagfile 'flagfile_path'

	2. with command line

			your_prog_with_gflags -my_flag1 value1 -my_flag2 value2

2. parse sequence, set default flagfile first, then parse the command line

	`flagfile` is the reserved word of gflags, which defines which file to find
	the flags

		if (is_file_existed("list.conf") {
		    google::SetCommandLineOption("flagfile", "list.conf");
		}
		google::ParseCommandLineFlags(&argc, &argv, true);
	
	the above code will do the the following:
	1. try to assign the flags by reading default flagfile `list.conf`
	2. try to assign the flags by parsing the command line, values previously defined in flagfile will be
		 override

	Note that the `flagfile` can be define again in command line, which will make
	gflags to read the specific flagfile, flag defined in flagfile can always be
	override by command line

2. enjoy!

2. references

	<http://google-gflags.googlecode.com/svn/trunk/doc/gflags.html>
