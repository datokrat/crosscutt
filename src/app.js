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
    this.doRouting(route, [
      [
        "article/",
        (path) => {
          this.view = new ArticleDetail(this.notify, this.dataSource);
          this.view.start(path);
        },
      ],
      [
        "reference/",
        (path) => {
          this.view = new ReferenceView(this.notify, this.dataSource);
          this.view.start(path);
        },
      ],
      [
        "",
        (path) => {
          this.view = new BlogList(this.notify, this.dataSource);
          this.view.start(path);
        },
      ],
    ]);
    this.notify();
  }

  doRouting(route, handlers) {
    const applicableHandler = handlers.find(isHandlerApplicableTo(route));

    if (applicableHandler !== undefined) {
      return applyHandler(route, applicableHandler);
    } else {
      throw new Error("No suitable route found");
    }

    function isHandlerApplicableTo(route) {
      return ([path, _]) => route.startsWith(path);
    }

    function applyHandler(route, [path, handler]) {
      return handler(route.slice(path.length));
    }
  }

  render() {
    return this.view.render();
  }
}
