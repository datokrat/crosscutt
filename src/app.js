import { BlogList } from "./list";
import { ArticleDetail } from "./detail";
import { ReferenceView } from "./reference";

export class App {
  constructor(notify, { dataSource }) {
    this.notify = notify;
    this.dataSource = dataSource;

    this.blogList = new BlogList(this.notify, this.dataSource);
    this.articleDetail = new ArticleDetail(this.notify, this.dataSource);
    this.referenceView = new ReferenceView(this.notify, this.dataSource);
  }

  init(route) {
    this.route = route;
    this.getActiveView().start(this.getViewSpecificRoute());
    this.notify();
  }

  render() {
    return this.getActiveView().render();
  }

  getViewSpecificRoute() {
    switch (this.getActiveView()) {
      case this.articleDetail:
        return this.route.slice("article/".length);
      case this.referenceView:
        return this.route.slice("reference/".length);
      default:
        return "";
    }
  }

  handle_route_change(new_route) {
    this.oldView = this.getActiveView();
    this.route = new_route;
    if (this.getActiveView() === this.articleDetail) {
      this.articleDetail.handleRouteChange(this.route.slice(8));
    } else if (this.getActiveView() === this.referenceView) {
      this.referenceView.handleRouteChange(this.route.slice(10));
    }
    this.notify();
  }

  getActiveView() {
    if (this.route.startsWith("article/")) {
      return this.articleDetail;
    } else if (this.route.startsWith("reference/")) {
      return this.referenceView;
    } else {
      return this.blogList;
    }
  }
}
