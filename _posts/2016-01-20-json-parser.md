---
layout: post
title:  "json parser"
date: 2016-01-20 20:15:27 +0800
comments: true
categories: experience practice c++
tags: c++ json
---

This is a practice of parsing a json string with c++.

the sandard is from <https://www.json.org>
## State machine
We usually use state machine to solve the string-paring problems.
<!-- more -->

<figure>
	<img src="/images/json_parser_state_machine.png" alt="">
	<figcaption>json parser</figcaption>
</figure>

## Implementation in c++

If we can prettify a json string, we have aready parsed it.

```
enum JsonState {
    BEGIN,
    OBJECT,
    KEY,
    KEY_VALUE_SEPARATOR,
    VALUE,
    END_VALUE,
    END_OBJECT,

    ARRAY,
    END_ARRAY,

    COMMA,

    NUMBER,
    STRING,
    BOOLEAN,
    NULL_VALUE,

    END,
};

std::map<JsonState, std::string> state_map = {
    {JsonState::BEGIN, "BEGIN"},
    {JsonState::OBJECT, "OBJECT"},
    {JsonState::KEY, "KEY"},
    {JsonState::KEY_VALUE_SEPARATOR, "KEY_VALUE_SEPARATOR"},
    {JsonState::VALUE, "VALUE"},
    {JsonState::END_VALUE, "END_VALUE"},
    {JsonState::END_OBJECT, "END_OBJECT"},

    {JsonState::ARRAY, "ARRAY"},

    {JsonState::COMMA, "COMMA"},

    {JsonState::NUMBER, "NUMBER"},
    {JsonState::STRING, "STRING"},
    {JsonState::BOOLEAN, "BOOLEAN"},
    {JsonState::NULL_VALUE, "NULL_VALUE"},

    {JsonState::END, "END"},
};

int prettify_json(const std::string& json, int indent_size, std::string* out) {
    out->clear();
    std::stringstream ss;
    char last_char = '\0';
    JsonState state = JsonState::BEGIN;
    int indent = 0;
    auto indents = [&indent_size](int indent)-> std::string {
            std::string str;
            indent = indent * indent_size;
            while (indent--) {
                str += " ";
            }
            return str;
    };
    std::string white_chars = " \t\n\r";
    auto is_white_char = [&white_chars](char c)-> bool {
            return white_chars.find(c) != std::string::npos;
    };

    std::string number;
    std::string boolean;
    std::string string;
    std::string null;

    std::string key;

    std::stack<JsonState> container_ctx;

    char c = '\0';
    for (size_t i = 0; i < json.size();) {
        if (i > 0) {
            last_char = json[i - 1];
        }
        c = json[i];
        switch (state) {
            case JsonState::BEGIN: {
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                if (c == '{') {
                    state = JsonState::OBJECT;
                    ss << c << std::endl << indents(++indent);
                } else if (c == '[') {
                    state = JsonState::ARRAY;
                    ss << c << std::endl << indents(++indent);
                } else if (!is_white_char(c)) {
                    std::cout << "malformat json" << std::endl;
                    return i;
                }
                ++i;
                break;
            }
            case JsonState::OBJECT: {
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                container_ctx.push(JsonState::OBJECT);
                if (c == '"') {
                    state = JsonState::KEY;
                    continue; // keep " to next state
                } else if (c == '}') {
                    state = JsonState::END_OBJECT;
                    if (container_ctx.top() != JsonState::OBJECT) {
                        std::cout << "=xxxxxxxxxxxxxx" << std::endl;
                    }
                    ss << std::endl << indents(indent--) << c;
                } else if (!is_white_char(c)) {
                    std::cerr << "malformat json" << std::endl;
                    return i;
                }
                ++i;
                break;
            }
            case JsonState::KEY: {
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                if (key.size() == 0) {
                    if (c == '"') {
                        key = '"';
                        ss << c;
                    } else if (!is_white_char(c)) {
                        std::cerr << "malformat json at: " << i << std::endl;
                        return i;
                    }
                } else {
                    ss << c;
                    key += c;
                    if (c == '"' && last_char != '\\') {
                        key.clear();
                        state = JsonState::KEY_VALUE_SEPARATOR;
                    }
                }
                ++i;
                break;
            }
            case JsonState::KEY_VALUE_SEPARATOR: {
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                if (c == ':') {
                    ss << c << ' '; // separator
                    state = JsonState::VALUE;
                } else if (!is_white_char(c)) {
                    std::cerr << "malformat json at: " << i << std::endl;
                    return i;
                }
                ++i;
                break;
            }
            case JsonState::VALUE: { // value may be object, array, number, string or boolean
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                if (c == '{') {
                    state = JsonState::OBJECT;
                    ss << c << std::endl << indents(++indent);
                } else if (c == '[') {
                    state = JsonState::ARRAY;
                    ss << c << std::endl << indents(++indent);
                } else if (c == '"') {
                    state = JsonState::STRING;
                    string = c;
                    ss << c;
                } else if (c == '-' || (c >= '0' && c <= '9')) {
                    state = JsonState::NUMBER;
                    continue; // keep c to next state
                } else if (c == 't' || c == 'f') {
                    state = JsonState::BOOLEAN;
                    boolean = c;
                    ss << c;
                } else if (c == 'n') {
                    state = JsonState::NULL_VALUE;
                    null = c;
                    ss << c;
                } else if (!is_white_char(c)) {
                    std::cerr << "malformat json" << std::endl;
                    return i;
                }
                ++i;
                break;
            }
            case JsonState::COMMA: {
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                if (container_ctx.top() == JsonState::OBJECT) { // separator between pair
                    state = JsonState::KEY;
                } if (container_ctx.top() == JsonState::ARRAY) {
                    state = JsonState::VALUE;
                }
                break;
            }
            case JsonState::STRING: {
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                if (c == '"' && last_char != '\\') {
                    ss << c;
                    string.clear();
                    state = JsonState::END_VALUE;
                } else {
                    ss << c;
                    string += c;
                }
                ++i;
                break;
            }
            case JsonState::NUMBER: {
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                if ((c <= '9' && c >= '0') || c == 'e' || c == '.' || c == '-') {
                    number += c;
                    ss << c;
                    if (number.rfind('.') != number.find('.')
                            || number.rfind('-') != number.find('-')
                            || number.rfind('e') != number.find('e')) {
                        std::cerr << "malformat json, at: " << i << std::endl;
                        return i;
                    }
                } else if (is_white_char(c) || c == ']' || c == '}' || c == ',') {
                    number.clear();
                    state = JsonState::END_VALUE;
                    continue;
                } else {
                    std::cerr << "malformat json, at: " << i << std::endl;
                    return i;
                }
                ++i;
                break;
            }
            case JsonState::BOOLEAN: {
                if (c >= 'a' && c <= 'z') {
                    boolean += c;
                    ss << c;
                } else if (is_white_char(c) || c == '}' || c == ']' || c == ',') {
                    if (boolean != "true" && boolean != "false") {
                        std::cerr << "malformat json, at: " << i << std::endl;
                        return i;
                    }
                    boolean.clear();
                    state = JsonState::END_VALUE;
                    continue;
                } else {
                    std::cerr << "malformat json, at: " << i << std::endl;
                    return i;
                }
                ++i;
                break;
            }
            case JsonState::NULL_VALUE: {
                if (c >= 'a' && c <= 'z') {
                    null += c;
                    ss << c;
                } else if (is_white_char(c) || c == '}' || c == ']' || c == ',') {
                    if (null != "null") {
                        std::cerr << "malformat json, at: " << i << std::endl;
                        return i;
                    }
                    boolean.clear();
                    state = JsonState::END_VALUE;
                    continue;
                } else {
                    std::cerr << "malformat json, at: " << i << std::endl;
                    return i;
                }
                ++i;
                break;
            }
            case JsonState::END_VALUE: {
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                if (c == ',') {
                    ss << c << std::endl << indents(indent);
                    state = JsonState::COMMA;
                } else if (c == '}') { // state not changed
                    state = JsonState::END_OBJECT;
                    if (container_ctx.top() != JsonState::OBJECT) {
                        std::cout << "=xxxxxxxxxxxxxx" << std::endl;
                    }
                    ss << std::endl << indents(--indent) << c;
                } else if (c == ']') { // state not changed
                    state = JsonState::END_ARRAY;
                    if (container_ctx.top() != JsonState::ARRAY) {
                        std::cout << "=xxxxxxxxxxxxxx" << std::endl;
                    }
                    ss << std::endl << indents(--indent) << c;
                } else if (!is_white_char(c)) {
                    std::cerr << "malformat json" << std::endl;
                    return i;
                }
                ++i;
                break;
            }
            case JsonState::ARRAY: {
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                container_ctx.push(JsonState::ARRAY);
                if (c == '{') {
                    state = JsonState::OBJECT;
                    ss << c << std::endl << indents(++indent);
                } else if (c == '[') {
                    state = JsonState::ARRAY;
                    ss << c << std::endl << indents(++indent);
                } else if (c == '"') {
                    state = JsonState::STRING;
                    ss << c;
                } else if (c == '-' || (c >= '0' && c <= '9')) {
                    state = JsonState::NUMBER;
                    ss << c;
                } else if (c == 't' || c == 'f') {
                    state = JsonState::BOOLEAN;
                    ss << c;
                } else if (c == 'n') {
                    state = JsonState::NULL_VALUE;
                    ss << c;
                } else if (c == ']') {
                    state = JsonState::END_ARRAY;
                    if (container_ctx.top() != JsonState::ARRAY) {
                        std::cout << "=xxxxxxxxxxxxxx" << std::endl;
                    }
                    ss << indents(--indent) << std::endl << c;
                } else if (!is_white_char(c)) {
                    std::cerr << "malformat json" << std::endl;
                    return i;
                }
                ++i;
                break;
            }
            case JsonState::END_ARRAY:
            case JsonState::END_OBJECT: {
//                 std::cout << "state: " << state_map[state] << ", char: " << c /*<< " -> "*/ << std::endl;
                container_ctx.pop();
                state = JsonState::END_VALUE;
                if (container_ctx.size() == 0) {
                    state = JsonState::END;
                }
                break;
            }
            case JsonState::END: {
                if (!is_white_char(c)) {
                    std::cerr << "malformat json, at: " << i << std::endl;
                    return i;
                }
                ++i;
                break;
            }
            default: {
                ++i;
                break;
            }
        }
    }
    ss << std::endl;
    out->assign(ss.str());
    return 0;
}
```
