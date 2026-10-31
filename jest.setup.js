// Ajuste para las pruebas: el mock de ScrollView de React Native pasa el elemento
// `refreshControl` como prop del nodo nativo, y eso hace circular el JSON de toJSON().
// Aquí se sigue dibujando el RefreshControl, pero ya no se copia como prop.
const React = require('react');
const ScrollViewMock = require('react-native/Libraries/Components/ScrollView/ScrollView').default;
const View = require('react-native/Libraries/Components/View/View').default;
const requireNativeComponent = require('react-native/Libraries/ReactNative/requireNativeComponent').default;
const RCTScrollView = requireNativeComponent('RCTScrollView');

ScrollViewMock.prototype.render = function render() {
  const { refreshControl, children, ...props } = this.props;
  return React.createElement(RCTScrollView, props, refreshControl, React.createElement(View, null, children));
};
