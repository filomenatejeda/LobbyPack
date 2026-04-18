const MOJIBAKE_PATTERN = /[ÃÂâ][^\s]?/;

function scoreMojibake(value: string) {
  return (value.match(/[ÃÂâ]/g) ?? []).length;
}

export function repairPotentialMojibake(value: string) {
  if (!value || !MOJIBAKE_PATTERN.test(value)) {
    return value;
  }

  let currentValue = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const decodedValue = Buffer.from(currentValue, "latin1").toString("utf8");

    if (scoreMojibake(decodedValue) >= scoreMojibake(currentValue)) {
      break;
    }

    currentValue = decodedValue;

    if (!MOJIBAKE_PATTERN.test(currentValue)) {
      break;
    }
  }

  return currentValue;
}
