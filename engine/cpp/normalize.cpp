// Optional C++ normalization kernel; deliberately independent of cloud runtime.
// Build: c++ -std=c++20 -O2 -Wall -Wextra normalize.cpp -o trace-normalize
#include <algorithm>
#include <cctype>
#include <iostream>
#include <string>
#include <string_view>
std::string normalize_identifier(std::string_view input) {
  auto first=input.find_first_not_of(" \t\r\n");
  if(first==std::string_view::npos)return {};
  auto last=input.find_last_not_of(" \t\r\n");
  std::string out(input.substr(first,last-first+1));
  std::transform(out.begin(),out.end(),out.begin(),[](unsigned char c){return static_cast<char>(std::tolower(c));});
  return out;
}
int main(int argc,char** argv) {
  if(argc!=2){std::cerr<<"usage: trace-normalize IDENTIFIER\n";return 2;}
  std::cout<<normalize_identifier(argv[1])<<"\n";
}
