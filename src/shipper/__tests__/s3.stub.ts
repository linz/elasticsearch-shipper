export interface AwsResponse<T> {
  promise(): Promise<T>;
}

// Fake SSM parameter result
function toSsm(value: unknown): AwsResponse<{ Parameter: { Value: string } }> {
  return {
    promise(): Promise<{ Parameter: { Value: string } }> {
      return Promise.resolve({
        Parameter: {
          Value: JSON.stringify(value),
        },
      });
    },
  };
}

function toS3(value: Buffer | unknown): AwsResponse<{ Body: Buffer }> {
  if (!Buffer.isBuffer(value)) value = Buffer.from(JSON.stringify(value));
  return {
    promise(): Promise<{ Body: Buffer }> {
      return Promise.resolve({ Body: value as Buffer });
    },
  };
}

export const AwsStub = {
  toS3,
  toSsm,
};
