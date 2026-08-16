import type { Link } from '../data/types'

type Props = {
    link: Link
    className?: string
    onDialog?: () => void
}

function classes({ external, dialog }: Link, className?: string) {
    return [className, dialog && 'link-button', external && 'link-ext']
        .filter(Boolean)
        .join(' ')
}

export function Anchor({ link, className, onDialog }: Props) {
    if (link.dialog) {
        return (
            <button type="button" className={classes(link, className)} onClick={onDialog}>
                {link.label}
            </button>
        )
    }

    return (
        <a
            href={link.href}
            className={classes(link, className)}
            {...(link.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        >
            {link.label}
        </a>
    )
}
