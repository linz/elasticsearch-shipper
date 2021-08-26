# [3.2.0](https://github.com/linz/elasticsearch-shipper/compare/v3.1.0...v3.2.0) (2021-08-26)


### Bug Fixes

* misc fixes ([#418](https://github.com/linz/elasticsearch-shipper/issues/418)) ([e5162fe](https://github.com/linz/elasticsearch-shipper/commit/e5162fee8f10f92861e6725af0699e09df06dc22))



# [3.1.0](https://github.com/linz/elasticsearch-shipper/compare/v3.0.0...v3.1.0) (2021-08-25)


### Features

* support logs being sent to multiple locations  ([#417](https://github.com/linz/elasticsearch-shipper/issues/417)) ([0344e64](https://github.com/linz/elasticsearch-shipper/commit/0344e64a7db0584c515d2439d0f3b9a8215906a6))
* support sending logs to a dead letter queue if the fail to index ([#416](https://github.com/linz/elasticsearch-shipper/issues/416)) ([c0a9a0e](https://github.com/linz/elasticsearch-shipper/commit/c0a9a0ea69b2ddfd9acbf003d8cd0d5b3eee4fd5))



# [3.0.0](https://github.com/linz/elasticsearch-shipper/compare/v2.0.0...v3.0.0) (2021-08-16)


### Features

* remove account id from index name ([#397](https://github.com/linz/elasticsearch-shipper/issues/397)) ([c1462b9](https://github.com/linz/elasticsearch-shipper/commit/c1462b92f014c3aac250197979ef3cc60fe81b99))



# [2.0.0](https://github.com/linz/elasticsearch-shipper/compare/v1.2.0...v2.0.0) (2021-07-15)


### Features

* switch to s3 assets for configuration ([#360](https://github.com/linz/elasticsearch-shipper/issues/360)) ([b400ee8](https://github.com/linz/elasticsearch-shipper/commit/b400ee84593229aa1226dab42ebb988b837afc51))


### BREAKING CHANGES

* this changes configuration from using SSM to S3, any reference to `/config/value` should be changed to `ssm://config/value`

* refactor: remove unused code

* refactor: put back accidently deleted code



# [1.2.0](https://github.com/linz/elasticsearch-shipper/compare/v1.1.2...v1.2.0) (2021-06-30)


### Bug Fixes

* retry fetching ssm parameters upto 3 times ([#335](https://github.com/linz/elasticsearch-shipper/issues/335)) ([11cff36](https://github.com/linz/elasticsearch-shipper/commit/11cff366d2d2add85066be29cebda90743f9e2a1))


### Features

* include index name and elastic cluster id in log message when dropping logs ([#334](https://github.com/linz/elasticsearch-shipper/issues/334)) ([f06fb60](https://github.com/linz/elasticsearch-shipper/commit/f06fb60a6592cd63ed9b3d8b54cc225d508fc290))



## [1.1.2](https://github.com/linz/elasticsearch-shipper/compare/v1.1.1...v1.1.2) (2021-06-25)


### Bug Fixes

* use standard lambda function as bundling typescript is hard for dependencies ([#329](https://github.com/linz/elasticsearch-shipper/issues/329)) ([153bd71](https://github.com/linz/elasticsearch-shipper/commit/153bd714bd2498a9ed245d2b23ab38998bc2b7be))


### Features

* allow buckets not created by cdk to be used as sources ([#328](https://github.com/linz/elasticsearch-shipper/issues/328)) ([8bc57e8](https://github.com/linz/elasticsearch-shipper/commit/8bc57e858ba726257ef4b654b19b34738feb46a2))



## [1.1.1](https://github.com/linz/elasticsearch-shipper/compare/v1.1.0...v1.1.1) (2021-06-18)


### Bug Fixes

* make vpc optional ([#322](https://github.com/linz/elasticsearch-shipper/issues/322)) ([c135e2d](https://github.com/linz/elasticsearch-shipper/commit/c135e2d37cd8493dd4ad68e5b44d0980db2fecf4))



# [1.1.0](https://github.com/linz/elasticsearch-shipper/compare/v1.0.0...v1.1.0) (2021-06-18)


### Bug Fixes

* ssm values are references and cannot be validated ([#320](https://github.com/linz/elasticsearch-shipper/issues/320)) ([d0f74f9](https://github.com/linz/elasticsearch-shipper/commit/d0f74f97492ce7e7db5f0de96d6bfc43c62ead87))


### Features

* configure shipper with cdk on deployment ([#319](https://github.com/linz/elasticsearch-shipper/issues/319)) ([6d03920](https://github.com/linz/elasticsearch-shipper/commit/6d039204447ada50ff3918b8cff30fc9e47eb948))
* convert to cdk nodejs lambda construct using esbuild ([#321](https://github.com/linz/elasticsearch-shipper/issues/321)) ([be86fe2](https://github.com/linz/elasticsearch-shipper/commit/be86fe2e91ec5bb929e501c37a3b66279cc6d26c))
* export all the validators and config types ([#318](https://github.com/linz/elasticsearch-shipper/issues/318)) ([15bb975](https://github.com/linz/elasticsearch-shipper/commit/15bb9759fce15db60ffe7eab84ae51d617db611a))



# [1.0.0](https://github.com/linz/elasticsearch-shipper/compare/v0.6.2...v1.0.0) (2021-06-17)


### Features

* allow configuration to reference SSM for connection strings ([#301](https://github.com/linz/elasticsearch-shipper/issues/301)) ([43ff444](https://github.com/linz/elasticsearch-shipper/commit/43ff444c8f571065b65724d1fdee9f45fe5d047d))



## [0.6.2](https://github.com/linz/elasticsearch-shipper/compare/v0.6.1...v0.6.2) (2020-10-13)


### Bug Fixes

* Handle the case where the logObject has a key called 'message'. ([#130](https://github.com/linz/elasticsearch-shipper/issues/130)) ([cb8ddfa](https://github.com/linz/elasticsearch-shipper/commit/cb8ddfa441d5fb2503888383c811f30210b71568))


### Features

* support indexes that rotate "yearly" ([#103](https://github.com/linz/elasticsearch-shipper/issues/103)) ([fe49555](https://github.com/linz/elasticsearch-shipper/commit/fe49555128a639c0b8be57ab73366143e9a82a34))



## [0.6.1](https://github.com/linz/elasticsearch-shipper/compare/v0.6.0...v0.6.1) (2020-09-02)


### Bug Fixes

* change aws elastic search connector to support bulk helper ([#88](https://github.com/linz/elasticsearch-shipper/issues/88)) ([18f96a1](https://github.com/linz/elasticsearch-shipper/commit/18f96a189ad665c833cb274287c81ba27c008145))



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
