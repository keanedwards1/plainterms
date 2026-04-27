import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});

export async function readParameter(name, withDecryption = false) {
  const cmd = new GetParameterCommand({
    Name: name,
    WithDecryption: withDecryption,
  });
  const res = await ssm.send(cmd);
  const value = res?.Parameter?.Value;
  if (!value) {
    throw new Error(`SSM parameter has no value: ${name}`);
  }
  return value;
}

export async function maybeReadParameter(name, withDecryption = false) {
  if (!name) return undefined;
  return readParameter(name, withDecryption);
}
