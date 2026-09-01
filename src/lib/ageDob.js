export function calculateAge(value) {
  if (!value) return "";

  const dob = new Date(`${value}T12:00:00`);

  if (Number.isNaN(dob.getTime())) {
    return "";
  }

  const today = new Date();

  let age =
    today.getFullYear() - dob.getFullYear();

  const month =
    today.getMonth() - dob.getMonth();

  if (
    month < 0 ||
    (month === 0 &&
      today.getDate() < dob.getDate())
  ) {
    age -= 1;
  }

  return String(Math.max(0, age));
}

export function approximateBirthYear(ageValue) {
  const age = Number(ageValue);

  if (
    !Number.isInteger(age) ||
    age < 0 ||
    age > 130
  ) {
    return "";
  }

  return String(
    new Date().getFullYear() - age,
  );
}

export function dobForAge(currentDob, ageValue) {
  if (!currentDob) return "";

  const age = Number(ageValue);

  if (
    !Number.isInteger(age) ||
    age < 0 ||
    age > 130
  ) {
    return currentDob;
  }

  const current = new Date(
    `${currentDob}T12:00:00`,
  );

  if (Number.isNaN(current.getTime())) {
    return currentDob;
  }

  const today = new Date();
  const month = current.getMonth();
  const day = current.getDate();

  const birthdayPassed =
    today.getMonth() > month ||
    (today.getMonth() === month &&
      today.getDate() >= day);

  const year =
    today.getFullYear() -
    age -
    (birthdayPassed ? 0 : 1);

  const maxDay = new Date(
    year,
    month + 1,
    0,
  ).getDate();

  return [
    year,
    String(month + 1).padStart(2, "0"),
    String(Math.min(day, maxDay)).padStart(
      2,
      "0",
    ),
  ].join("-");
}
