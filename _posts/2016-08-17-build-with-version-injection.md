---
layout: post
title:  "build with version injection"
date: 2016-08-17 21:37:03 +0800
categories: experience project-managment
---

## java, c++, go, version, build, maven, ant, g++
time: 2016-08-17-Wed 21:37:03

in many cases we need to update the version info in source file manually before
release, however, we often forget to update them, because it's a "concealed" bug
before release

we can use some scripts to automate the procedure to inject version info into
source file

### java
<!-- more -->
1. define a version file, say, `src/main/com/your/package/Version.java`

		package com.your.package;

		public class Version {
			public static String version = "0.1.0";
			public static String gitCommitVersion = "c63f5bc6996abda77636a7aa9d74863e54ef6c5b";
			public static String buildDate = "2016-08-18 14:23:49";
		}

2. define a build script to update the version info in `Version.java`

		...
		
		# put version into file
		version_file=src/main/com/your/package/Version.java
		if [ -f "${version_file}" ]; then
			git_version=`git rev-parse HEAD`
			build_date=`date +"%Y-%m-%d %H:%M:%S"`
			if [ "x${git_version}" == "x" ]; then
				echo "no git commit version detected!"
			fi
			sed -ri "s#(.*version *= *)(.*)#\1\"${version}\";#" ${version_file}
			sed -ri "s#(.*gitCommitVersion *= *)(.*)#\1\"${git_version}\";#" ${version_file}
			sed -ri "s#(.*buildDate *= *)(.*)#\1\"${build_date}\";#" ${version_file}
		else
			echo "no version file!"
			exit -1
		fi
		
		...

3. build the project with build tools: maven or ant
	1. maven, update version in `pom.xml`, and then build

			mvn versions:set -DnewVersion=${version}
			maven package

	2. ant, update version info in `build.xml` as using maven if there is one

### go lang

1. define version and date variable in main.go

		package main
		
		import (
			"flag"
			// ...
		)
		
		// ...
		
		var (
			version = "unknown"
			build_date = "unknown"
		)
		
		func PrintVersion(c *gin.Context) {
			c.JSON(200, map[string]string{
				"version": version,
				"buildDate": build_date,
			})
			c.Abort()
		}

2. build with `-x` option

	go build -o ${output_bin_name} -ldflags "-X main.version=${version} \
		-X main.build_date=${build_date}" src/main.go || exit

### c++
1. use a macro to define version

		#include <iostream>
		
		int main(int argc, char** argv) {
		  std::cout << testDescription << std::endl;
		  std::cout << "version: " << VERSION << std::endl;
		  return 0;
		}

2. build with `-DVERSION "\"new version\""`

		g++ -DVERSION "\"new version\"" main.cpp

### python
just define a `version.py`

	version=0.0.0

and invoke it anywhere which needs version info

### other language
for static language, inject version info into source file and build
for dynamic language, just define the version info in a separated file

