import AppLayout from './AppLayout'

// HOC to wrap pages with AppLayout
export default function withLayout(PageComponent, title, subtitle) {
  return function WrappedPage(props) {
    return (
      <AppLayout title={title} subtitle={subtitle}>
        <PageComponent {...props} />
      </AppLayout>
    )
  }
}