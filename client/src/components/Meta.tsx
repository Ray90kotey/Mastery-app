import { useEffect } from "react";

export default function Meta(props: { title: string; description?: string }) {
  useEffect(() => {
    document.title = props.title;

    if (props.description) {
      let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", props.description);
    }
  }, [props.title, props.description]);

  return null;
}
