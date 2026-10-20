export function validatePersonalInfo(name: string, phone: string) {
  const display_name = name.trim();
  const normalizedPhone = phone.trim();
  if (!display_name || display_name.length > 100 || /[\x00-\x1f\x7f]/.test(display_name)) throw new Error("이름은 1~100자로 입력해 주세요.");
  const digits = normalizedPhone.replace(/\D/g, "");
  if (!/^[0-9+() .-]{7,30}$/.test(normalizedPhone) || digits.length < 7 || digits.length > 15) throw new Error("연락처는 숫자 7~15자리로 입력해 주세요. 공백·괄호·하이픈·국가번호 표시는 사용할 수 있습니다.");
  return { display_name, phone: normalizedPhone };
}

export function validateNewEmail(email: string) {
  const value = email.trim();
  if (value.length > 254 || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value)) throw new Error("올바른 이메일 주소를 입력해 주세요.");
  return value;
}
