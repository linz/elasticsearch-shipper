declare module 'aws-elasticsearch-connector' {
  import { Connection, Transport } from '@elastic/elasticsearch';
  // These types are not 100% correct as the connector adds more to them
  // Ideally a @types/aws-elasticsearch-connector should be made.
  const AmazonConnection: Connection;
  const AmazonTransport: Transport;

  interface AwsConnector {
    AmazonConnection: typeof Connection;
    AmazonTransport: typeof Transport;
  }
  const output: AwsConnector;
  export = output;
}
