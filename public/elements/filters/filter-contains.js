/**
 * Filter items that contains a specific char sequence, case insensitive
 * @param  {array} items
 * @param  {string} field
 * @param  {string} letter
 * @return {array}
 */
PolymerExpressions.prototype.contains = function (items, field, letter) {
  var filtered = [];
  items.forEach(function(item) {
    item[field].toLowerCase().indexOf(letter.toLowerCase()) > -1 && filtered.push(item);
  });
  return filtered;
};