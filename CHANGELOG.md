# [3.6.0](https://github.com/linz/elasticsearch-shipper/compare/v3.5.3...v3.6.0) (2021-09-01)


### Features

* Tag oversized logs. ([#434](https://github.com/linz/elasticsearch-shipper/issues/434)) ([8c974c5](https://github.com/linz/elasticsearch-shipper/commit/8c974c5faaeedc5efbe3aec882c008c9820e0f01))



## [4.2.2](https://github.com/linz/elasticsearch-shipper/compare/v4.2.1...v4.2.2) (2023-03-08)


### Bug Fixes

* infinite recursion when finding dead letter queues ([#720](https://github.com/linz/elasticsearch-shipper/issues/720)) ([1f33469](https://github.com/linz/elasticsearch-shipper/commit/1f3346900c7bc63c57fac53e3306eeae10b3ad9c))

## [4.2.1](https://github.com/linz/elasticsearch-shipper/compare/v4.2.0...v4.2.1) (2023-01-24)


### Bug Fixes

* correct typings for bulk imports ([#688](https://github.com/linz/elasticsearch-shipper/issues/688)) ([0a3d24a](https://github.com/linz/elasticsearch-shipper/commit/0a3d24af41bbf340f40c78112278e65875796088))

## [4.2.0](https://github.com/linz/elasticsearch-shipper/compare/v4.1.0...v4.2.0) (2023-01-23)


### Features

* add time a log was processed by the shipper to default fields ([#687](https://github.com/linz/elasticsearch-shipper/issues/687)) ([847fd49](https://github.com/linz/elasticsearch-shipper/commit/847fd49905c707bf27129deaf998debc838db4c2))
* allow configuration of dead letter queue and drop max bytes ([b8f7785](https://github.com/linz/elasticsearch-shipper/commit/b8f77856b76781510fd7633863e07202c8db67f2))
* allow configuration of dead letter queue per connection ([22497bb](https://github.com/linz/elasticsearch-shipper/commit/22497bbcf84cc3dadef29f34b8bfb848ea0ddc05))

## [4.1.0](https://github.com/linz/elasticsearch-shipper/compare/v4.0.2...v4.1.0) (2022-09-08)


### Features

* more complex transform logic ([#667](https://github.com/linz/elasticsearch-shipper/issues/667)) ([29ed3c0](https://github.com/linz/elasticsearch-shipper/commit/29ed3c04e76e51de7c806e60890f90ea3bb8ef0a))


### Bug Fixes

* export transformation symbol and types ([c9457fb](https://github.com/linz/elasticsearch-shipper/commit/c9457fb9778922209aa4601a5e8d25fedf0fdd79))

## [4.0.2](https://github.com/linz/elasticsearch-shipper/compare/v4.0.1...v4.0.2) (2022-09-07)


### Bug Fixes

* elasticsearch is a dep not a dev dep ([d5d4d1e](https://github.com/linz/elasticsearch-shipper/commit/d5d4d1e23796564803b073418d243e1efffd02a8))

## [4.0.1](https://github.com/linz/elasticsearch-shipper/compare/v4.0.0...v4.0.1) (2022-09-06)


### Bug Fixes

* do not attempt to match weird messages ([68cf2db](https://github.com/linz/elasticsearch-shipper/commit/68cf2dbcf2c15badb5cf4aaa1a934105a4a2a94e))

## [4.0.0](https://github.com/linz/elasticsearch-shipper/compare/v3.7.0...v4.0.0) (2022-09-06)


### ⚠ BREAKING CHANGES

* switch to esm

### Features

* export env const ([408f969](https://github.com/linz/elasticsearch-shipper/commit/408f969a56e50ec38e94481447935b6b1dedf7ce))
* export logHandler as the lambda entry ([645f9ba](https://github.com/linz/elasticsearch-shipper/commit/645f9ba8ec362d87bfbdab89e91b9c9807583d2a))
* expose original log message ([9d1e73e](https://github.com/linz/elasticsearch-shipper/commit/9d1e73e307f0e12452b28a7dfae2a37e0f54c794))
* switch to esm ([14bc3a1](https://github.com/linz/elasticsearch-shipper/commit/14bc3a1f8cbd85cc8f98636cee030cec8e64e79d))

## [3.7.0](https://github.com/linz/elasticsearch-shipper/compare/v3.6.2...v3.7.0) (2022-09-05)


### Features

* allow transformation of logs with a callback function ([6d4196c](https://github.com/linz/elasticsearch-shipper/commit/6d4196c320b98eacf1c5122bdb28a64e2642c7de))
* remove CDK and let consumers build their own CDK ([2b8f966](https://github.com/linz/elasticsearch-shipper/commit/2b8f9667b5127e5c534fa1dfa1d4c9254ea9df79))


### Bug Fixes

* only log first 4KB of failed log lines ([99963cb](https://github.com/linz/elasticsearch-shipper/commit/99963cbea12fe280f142ed8fe7c5b5a7170c4e4b))
* substr is deprecated ([acfca06](https://github.com/linz/elasticsearch-shipper/commit/acfca066768560f1a6f0416197b5ec5fd696fd15))

## [3.5.3](https://github.com/linz/elasticsearch-shipper/compare/v3.5.2...v3.5.3) (2021-08-31)


### Bug Fixes

* Access log regex ([#433](https://github.com/linz/elasticsearch-shipper/issues/433)) ([73b8712](https://github.com/linz/elasticsearch-shipper/commit/73b8712a7e1bcb8a263e5ab06291132582b776f5))
* avoid running regexps on large inputs ([#432](https://github.com/linz/elasticsearch-shipper/issues/432)) ([dd1cafa](https://github.com/linz/elasticsearch-shipper/commit/dd1cafa4d03725b4905f47ee0f94c612812fef98))


### Reverts

* Revert "feat: track slow requests (#427)" ([57d60bb](https://github.com/linz/elasticsearch-shipper/commit/57d60bb8f2ed6921e12b573f7309a222d5f7e97c)), closes [#427](https://github.com/linz/elasticsearch-shipper/issues/427)



## [3.5.2](https://github.com/linz/elasticsearch-shipper/compare/v3.5.1...v3.5.2) (2021-08-30)


### Features

* track slow requests ([#427](https://github.com/linz/elasticsearch-shipper/issues/427)) ([df7f2ca](https://github.com/linz/elasticsearch-shipper/commit/df7f2ca0fa123d139078e4dd6f2b3f56334e4bc5))



## [3.5.1](https://github.com/linz/elasticsearch-shipper/compare/v3.5.0...v3.5.1) (2021-08-29)


### Bug Fixes

* correct end timer name ([#425](https://github.com/linz/elasticsearch-shipper/issues/425)) ([c671d9e](https://github.com/linz/elasticsearch-shipper/commit/c671d9eb527db70b89557f0204f5aa5a1fa9ca0a))



# [3.5.0](https://github.com/linz/elasticsearch-shipper/compare/v3.4.2...v3.5.0) (2021-08-27)


### Features

* switch to `@linzjs/lambda` ([#423](https://github.com/linz/elasticsearch-shipper/issues/423)) ([29c51e7](https://github.com/linz/elasticsearch-shipper/commit/29c51e788cc3555f18e4593f3930412a80b63d83))



## [3.4.2](https://github.com/linz/elasticsearch-shipper/compare/v3.4.1...v3.4.2) (2021-08-26)


### Bug Fixes

* greatly reduce log levels ([74009ad](https://github.com/linz/elasticsearch-shipper/commit/74009ad30464f5fd7a5ab47ff62207237e202abe))



## [3.4.1](https://github.com/linz/elasticsearch-shipper/compare/v3.4.0...v3.4.1) (2021-08-26)


### Bug Fixes

* correct array indexes for account stats ([e83dd1d](https://github.com/linz/elasticsearch-shipper/commit/e83dd1d26dd2d0321c81e7372b956997bb50fe33))



# [3.4.0](https://github.com/linz/elasticsearch-shipper/compare/v3.3.0...v3.4.0) (2021-08-26)


### Features

* provide more details if only one aws account was used ([06a5700](https://github.com/linz/elasticsearch-shipper/commit/06a57005525e97255d2ca7558df182c92ed5b5d2))



# [3.3.0](https://github.com/linz/elasticsearch-shipper/compare/v3.2.1...v3.3.0) (2021-08-26)


### Features

* count the number of records processed per account ([2ebce93](https://github.com/linz/elasticsearch-shipper/commit/2ebce934d21eb8e8425c334f9328f979f9c37610))
* track per account stats ([e10db81](https://github.com/linz/elasticsearch-shipper/commit/e10db818c250059cb84ca06d2fa9cbca20c91793))



## [3.2.1](https://github.com/linz/elasticsearch-shipper/compare/v3.2.0...v3.2.1) (2021-08-26)


### Bug Fixes

* config was not being cached ([#420](https://github.com/linz/elasticsearch-shipper/issues/420)) ([f18e8f3](https://github.com/linz/elasticsearch-shipper/commit/f18e8f3be9703af718cd6aa021eb05a80eb6b642))
* remove closed connections ([#419](https://github.com/linz/elasticsearch-shipper/issues/419)) ([2e55ff7](https://github.com/linz/elasticsearch-shipper/commit/2e55ff71913067a5e64db0dd7e0331a49ecf88a7))



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
