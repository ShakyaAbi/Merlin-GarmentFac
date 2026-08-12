import type { FC, HTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { ChevronDown, Share04 } from "@untitledui/icons";
import { Link } from "react-router-dom";
import { cx, sortCx } from "@/utils/cx";

const styles = sortCx({
    root: "group relative flex w-full cursor-pointer items-center rounded-xl border border-transparent px-3 py-2.5 outline-none transition-colors duration-150 select-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500/20",
    rootSelected: "border-slate-200 bg-slate-900 text-white shadow-sm",
});

interface NavItemBaseProps {
    /** Whether the nav item shows only an icon. */
    iconOnly?: boolean;
    /** Whether the collapsible nav item is open. */
    open?: boolean;
    /** URL to navigate to when the nav item is clicked. */
    href?: string;
    /** Type of the nav item. */
    type: "link" | "collapsible" | "collapsible-child";
    /** Icon component to display. */
    icon?: FC<HTMLAttributes<HTMLOrSVGElement>>;
    /** Badge to display. */
    badge?: ReactNode;
    /** Whether the nav item is currently active. */
    current?: boolean;
    /** Whether to truncate the label text. */
    truncate?: boolean;
    /** Handler for click events. */
    onClick?: MouseEventHandler;
    /** Content to display. */
    children?: ReactNode;
}

export const NavItemBase = ({ current, type, badge, href, icon: Icon, children, truncate = true, onClick, iconOnly = false }: NavItemBaseProps) => {
    const iconElement = Icon && (
        <Icon
            aria-hidden="true"
            className={cx(
                "h-5 w-5 shrink-0 transition-colors",
                current ? "text-white" : "text-slate-400 group-hover/item:text-slate-700",
            )}
        />
    );

    const badgeElement =
        badge && (typeof badge === "string" || typeof badge === "number") ? (
            <span
                className={cx(
                    "ml-3 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    current ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600",
                )}
            >
                {badge}
            </span>
        ) : (
            badge
        );

    const labelElement = (
        <span
            className={cx(
                "flex-1 text-sm font-semibold transition-colors",
                current ? "text-white" : "text-slate-700 group-hover/item:text-slate-950",
                truncate && "truncate",
            )}
        >
            {children}
        </span>
    );

    const isExternal = href && href.startsWith("http");
    const externalIcon = isExternal && <Share04 className="size-4 stroke-[2.5px] text-fg-quaternary" />;

    if (type === "collapsible") {
        return (
            <summary
                className={cx(
                    "list-none",
                    styles.root,
                    current ? styles.rootSelected : "bg-transparent text-slate-700 hover:bg-slate-100",
                    iconOnly && "justify-center gap-0 px-2",
                )}
                onClick={onClick}
            >
                {iconElement}

                {!iconOnly ? labelElement : null}

                {!iconOnly ? badgeElement : null}

                {!iconOnly ? <ChevronDown aria-hidden="true" className="ml-3 h-4 w-4 shrink-0 text-slate-400 transition-transform in-open:-scale-y-100" /> : null}
            </summary>
        );
    }

    if (type === "collapsible-child") {
        return (
            <Link
                to={href!}
                target={isExternal ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className={cx("pl-10", styles.root, current ? styles.rootSelected : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950", iconOnly && "pl-4")}
                onClick={onClick}
                aria-current={current ? "page" : undefined}
            >
                {labelElement}
                {externalIcon}
                {badgeElement}
            </Link>
        );
    }

    return (
        <Link
            to={href!}
            target={isExternal ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className={cx("group/item", styles.root, current ? styles.rootSelected : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950", iconOnly && "justify-center gap-0 px-2")}
            onClick={onClick}
            aria-current={current ? "page" : undefined}
        >
            {iconElement}
            {!iconOnly ? labelElement : null}
            {!iconOnly ? externalIcon : null}
            {!iconOnly ? badgeElement : null}
        </Link>
    );
};
