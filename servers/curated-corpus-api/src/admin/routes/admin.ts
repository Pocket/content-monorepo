import { Router } from 'express';
import { getAdminContext } from '../context';
import { rejectApprovedCorpusItemsForDomain } from '../resolvers/mutations/ApprovedItem';

const adminRouter = Router();

// expose admin REST endpoint reject-approved-corpus-items-for-domain
adminRouter.post('/reject-approved-corpus-items-for-domain', async (req, res) => {
  const { domainName, testing } = req.body;
  // get the admin context
  const context = await getAdminContext({ req });
  console.log('reject-approved-corpus-items-for-domain context: ', context);

  if (!domainName) {
    return res.status(400).json({ error: 'Missing domainName query param' });
  }

  try {
    const result = await rejectApprovedCorpusItemsForDomain(null, domainName, testing, context);

    return res.json({
      testing,
      domainName,
      ...(testing
        ? { totalFoundApprovedCorpusItems: result } // do not reject/unschedule if testing=true
        : { totalRejectedApprovedCorpusItems: result }),
    });
  } catch (e) {
    console.error('Error rejecting approved corpus items:', e);
    res.status(500).send(`fail: ${e}`);
  }
});

export default adminRouter;