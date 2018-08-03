export default function makeEnum(enumNames) {
  return Object.freeze(
    enumNames.reduce(function(accumulator, name) {
      accumulator[name] = name;
      return accumulator;
    }, {})
  );
}