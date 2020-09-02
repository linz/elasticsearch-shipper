# [0.6.0](https://github.com/linz/elasticsearch-shipper/compare/v0.5.0...v0.6.0) (2020-09-02)


### Bug Fixes

* correctly log the list of elastic indexes used ([#86](https://github.com/linz/elasticsearch-shipper/issues/86)) ([c0cfec5](https://github.com/linz/elasticsearch-shipper/commit/c0cfec59633570e1ab29f09f0d9be6fd5cd8d503))


### Features

* Add index failure reason to logging. ([#84](https://github.com/linz/elasticsearch-shipper/issues/84)) ([d6b2a03](https://github.com/linz/elasticsearch-shipper/commit/d6b2a03d2c3721d747877ba94ba1879178c673b8))
* bulk load all logs in one go ([#87](https://github.com/linz/elasticsearch-shipper/issues/87)) ([99630db](https://github.com/linz/elasticsearch-shipper/commit/99630db2830d367ceb52a68974fb610b73745804))



# [0.5.0](https://github.com/linz/elasticsearch-shipper/compare/v0.4.2...v0.5.0) (2020-08-31)


### Features

* Add support for changing the maximum execution time. ([#70](https://github.com/linz/elasticsearch-shipper/issues/70)) ([71d31d0](https://github.com/linz/elasticsearch-shipper/commit/71d31d0ad45fe7341621e44c5cf6ec2d42d33d79))
* allow keys to be dropped from log lines before insertion ([#71](https://github.com/linz/elasticsearch-shipper/issues/71)) ([f83cb29](https://github.com/linz/elasticsearch-shipper/commit/f83cb29673a9483f18a065ccddcc700bc0ed7982))
* allow optional function to be used to modify and filter out unneeded log files ([#78](https://github.com/linz/elasticsearch-shipper/issues/78)) ([3e11e5e](https://github.com/linz/elasticsearch-shipper/commit/3e11e5ec4d02da89f219845f22f4b923a12e172d))
* Push ugly config to AWS to allow longer configs. ([e6ac0d2](https://github.com/linz/elasticsearch-shipper/commit/e6ac0d23e304c507a9e92f9726a21f4012772466))
* start tracking how long it takes to insert into elastic search ([#79](https://github.com/linz/elasticsearch-shipper/issues/79)) ([af8e35e](https://github.com/linz/elasticsearch-shipper/commit/af8e35e048e53671b174089db7ac5a4ddcfb51da))



## [0.4.2](https://github.com/linz/elasticsearch-shipper/compare/v0.4.1...v0.4.2) (2020-08-14)


### Bug Fixes

* correct more paths that are broken ([#55](https://github.com/linz/elasticsearch-shipper/issues/55)) ([f368134](https://github.com/linz/elasticsearch-shipper/commit/f36813452d9f614b77c99c531d47e071ab8910e1))



## [0.4.1](https://github.com/linz/elasticsearch-shipper/compare/v0.4.0...v0.4.1) (2020-08-13)


### Bug Fixes

* correct locations of index{.js,.d.ts} ([#52](https://github.com/linz/elasticsearch-shipper/issues/52)) ([4b43bb9](https://github.com/linz/elasticsearch-shipper/commit/4b43bb904163264620e2788342676ccee8d534c1))



# 0.4.0 (2020-08-13)


### Features

* create unique id per invocation ([#51](https://github.com/linz/elasticsearch-shipper/issues/51)) ([8e101a8](https://github.com/linz/elasticsearch-shipper/commit/8e101a83a95b324dfc857d07d2d69619fb24f764))



# 0.3.0 (2020-07-27)
