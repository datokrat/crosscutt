import { init } from "snabbdom/build/package/init";
import { eventListenersModule } from "snabbdom/build/package/modules/eventlisteners";
import { classModule } from "snabbdom/build/package/modules/class";
import { propsModule } from "snabbdom/build/package/modules/props";
import { datasetModule } from "snabbdom/build/package/modules/dataset";
import { attributesModule } from "snabbdom/build/package/modules/attributes";

import { dataSource } from "./settings";
import { App } from "./app";

const patch = init([
  classModule,
  propsModule,
  eventListenersModule,
  datasetModule,
  attributesModule,
]);

let vdom = null;

const app = new App(
  () => {
    apply_new_vdom(app.render());
  },
  { dataSource }
);

window.addEventListener("load", () => {
  app.init(get_route_from_location());
});

function apply_new_vdom(new_vdom) {
  vdom = patch(
    vdom !== null ? vdom : document.getElementById("snabbdom-container"),
    new_vdom
  );
}

// function apply_new_route(new_route) {
//  const current_route = get_route_from_location();
//  const new_location = new_route === "" ? "./" : "./?" + new_route;
//  if (window.history.state === null) {
//    console.log("replaceState", location);
//    window.history.replaceState(true, "", new_location);
//  } else if (current_route !== new_route) {
//    console.log("pushState", location.href, window.history.state);
//    window.history.pushState(true, "", new_location);
//  }
// }

function get_route_from_location() {
  return decodeURIComponent(location.search.slice(1));
}
