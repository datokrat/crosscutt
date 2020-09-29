import { h } from "snabbdom/build/package/h";
import { renderNavigation } from "./skeleton";
import { copyToClipboard } from "./miscellaneous";

export class ReferenceView {
  constructor(notify, dataSource) {
    this.notify = notify;
    this.dataSource = dataSource;
  }

  start(route) {
    const parts = route.split("/").map(decodeURIComponent);
    const referenceId = parts[0];
    const location =
      parts[1] !== undefined && parts[1] !== "" ? parts[1] : null;

    const epubReference = this.dataSource.loadReference(referenceId);
    this.session = new EpubReferenceSession(
      epubReference,
      location,
      this.notify
    );
    this.session.start();
  }

  render() {
    return this.session !== null
      ? this.session.render()
      : h("div", ["Reference View is idle"]);
  }
}

export class EpubReferenceSession {
  constructor(epubReference, location, notify) {
    this.notify = notify;
    this.wasStarted = false;
    this.wasStopped = false;
    this.epubReference = epubReference;
    this.location = location;
    this.selectedLocation = null;
  }

  start() {
    if (this.wasStarted) {
      throw new Error("The reference session cannot be started twice.");
    } else if (this.wasStopped) {
      throw new Error("The reference session cannot be restarted.");
    }

    this.wasStarted = true;

    this.book = ePub(this.epubReference.getFilename());
    this.rendition = null;
  }

  stop() {
    this.wasStopped = true;
  }

  render() {
    let content;
    if (this.wasStopped) {
      content = "Stopped";
    } else if (!this.wasStarted) {
      content = "Idle";
    } else {
      const book = h(
        "div.epub",
        {
          hook: {
            insert: (vnode) => renderTo.call(this, vnode.elm),
            destroy: (vnode) => dispose.call(this),
          },
        },
        []
      );

      content = h("div", [
        h(
          "button.btn.btn-primary",
          {
            on: {
              click: () => this.rendition.prev(),
            },
          },
          ["< Previous"]
        ),
        " ",
        h(
          "button.btn.btn-primary",
          {
            on: {
              click: () => this.rendition.next(),
            },
          },
          ["Next >"]
        ),
        " ",
        h(
          "button.btn.btn-secondary",
          {
            on: {
              click: () =>
                copyToClipboard(
                  getAbsolutePermalinkToCfi(
                    this.epubReference.getId(),
                    this.location
                  )
                ),
            },
          },
          ["Copy page permalink"]
        ),
        " ",
        this.selectedLocation !== null
          ? h(
              "button.btn.btn-secondary",
              {
                on: {
                  click: () =>
                    copyToClipboard(
                      getAbsolutePermalinkToCfi(
                        this.epubReference.getId(),
                        this.selectedLocation
                      )
                    ),
                },
              },
              ["Copy selection permalink"]
            )
          : undefined,
        " ",
        this.selectedLocation !== null
          ? h(
              "button.btn.btn-secondary",
              {
                on: {
                  click: () =>
                    copyToClipboard(
                      getInternalPermalinkToCfi(
                        this.epubReference.getId(),
                        this.selectedLocation
                      )
                    ),
                },
              },
              ["Copy selection permalink for markdown"]
            )
          : undefined,
        book,
      ]);

      function getInternalPermalinkToCfi(referenceId, cfi) {
        return "reference:" + referenceId + "/" + encodeURIComponent(cfi);
      }

      function getAbsolutePermalinkToCfi(referenceId, cfi) {
        const pathname = document.location.pathname
          .split("/")
          .slice(0, -1)
          .join("/");
        return (
          document.location.origin +
          pathname +
          "/?reference/" +
          referenceId +
          "/" +
          encodeURIComponent(cfi)
        );
      }

      function renderTo(node) {
        if (this.rendition === null) {
          this.rendition = this.book.renderTo(node, {
            width: 600,
            height: 600,
          });
          this.rendition.on("relocated", (currentRange) =>
            this.handleRelocation(currentRange.start.cfi)
          );
          this.rendition.on("selected", (cfiRange, contents) => {
            this.selectedLocation = cfiRange;
            const listener = () => {
              this.selectedLocation = null;
              contents.document.removeEventListener(
                "selectionchange",
                listener
              );
              this.notify();
            };
            contents.document.addEventListener("selectionchange", listener);
            this.notify();
          });
        }
        this.rendition.display(
          this.location !== null ? this.location : undefined
        );
        if (this.location !== null) {
          this.rendition.annotations.highlight(this.location, {}, () => {
            console.log("click");
          });
        }
      }
      function dispose() {
        this.rendition.clear();
      }
    }

    return h("div", [
      renderNavigation(),
      h("div.container", [
        h("h4", [this.epubReference.getTitle()]),
        h("div", [content]),
      ]),
    ]);
  }

  handleRelocation(location) {
    this.location = location;
    this.notify();
  }
}
